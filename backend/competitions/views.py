from django.core.exceptions import ValidationError as DjangoValidationError
from django.shortcuts import get_object_or_404
from rest_framework import generics, status
from rest_framework.permissions import AllowAny, IsAdminUser, IsAuthenticated
from rest_framework.response import Response
from rest_framework.views import APIView

from campaigns import services as campaign_services
from team.models import RosterEntry

from . import services as competition_services
from .models import Competition, Match
from .serializers import (
    BracketMatchSerializer,
    CompetitionCreateSerializer,
    CompetitionDetailSerializer,
    CompetitionListSerializer,
    DraftOrderItemSerializer,
    DraftStateSerializer,
    MatchResultSerializer,
    MatchSerializer,
    StandingRowSerializer,
)


class CompetitionListView(generics.ListCreateAPIView):
    queryset = Competition.objects.select_related("created_by").prefetch_related("participants")
    permission_classes = [AllowAny]

    def get_serializer_class(self):
        if self.request.method == "POST":
            return CompetitionCreateSerializer
        return CompetitionListSerializer

    def get_permissions(self):
        if self.request.method == "POST":
            return [IsAdminUser()]
        return [AllowAny()]

    def create(self, request, *args, **kwargs):
        serializer = self.get_serializer(data=request.data)
        serializer.is_valid(raise_exception=True)
        try:
            competition = competition_services.create_competition(
                request.user,
                **serializer.validated_data,
            )
        except DjangoValidationError as exc:
            return Response({"detail": str(exc)}, status=status.HTTP_400_BAD_REQUEST)
        return Response(
            CompetitionDetailSerializer(competition, context={"request": request}).data,
            status=status.HTTP_201_CREATED,
        )


class CompetitionDetailView(generics.RetrieveAPIView):
    queryset = Competition.objects.select_related("created_by").prefetch_related(
        "participants__user",
    )
    serializer_class = CompetitionDetailSerializer
    permission_classes = [AllowAny]


class JoinCompetitionView(APIView):
    permission_classes = [IsAuthenticated]

    def post(self, request, pk):
        competition = get_object_or_404(Competition, pk=pk)
        try:
            participant = competition_services.join_competition(request.user, competition)
        except DjangoValidationError as exc:
            return Response({"detail": str(exc)}, status=status.HTTP_400_BAD_REQUEST)
        return Response(
            CompetitionDetailSerializer(competition, context={"request": request}).data,
            status=status.HTTP_200_OK,
        )


class DraftStateView(APIView):
    permission_classes = [AllowAny]

    def get(self, request, pk):
        competition = get_object_or_404(Competition, pk=pk)
        try:
            session = competition.draft_session
        except Exception:
            return Response({"detail": "Draft ainda não iniciado."}, status=status.HTTP_404_NOT_FOUND)
        return Response(
            DraftStateSerializer(session, context={"request": request, "competition": competition}).data
        )


class StartDraftView(APIView):
    permission_classes = [IsAuthenticated]

    def post(self, request, pk):
        competition = get_object_or_404(Competition, pk=pk)
        try:
            session = competition_services.start_draft(request.user, competition)
        except DjangoValidationError as exc:
            return Response({"detail": str(exc)}, status=status.HTTP_400_BAD_REQUEST)
        return Response(
            DraftStateSerializer(session, context={"request": request, "competition": competition}).data,
            status=status.HTTP_200_OK,
        )


class DraftPickView(APIView):
    permission_classes = [IsAuthenticated]

    def post(self, request, pk):
        competition = get_object_or_404(Competition, pk=pk)
        player_id = request.data.get("player")
        if not player_id:
            return Response({"detail": "player é obrigatório."}, status=status.HTTP_400_BAD_REQUEST)
        try:
            pick = competition_services.make_pick(request.user, competition, int(player_id))
        except DjangoValidationError as exc:
            return Response({"detail": str(exc)}, status=status.HTTP_400_BAD_REQUEST)
        return Response(
            {
                "pick": {
                    "id": pick.id,
                    "pick_number": pick.pick_number,
                    "player": pick.player_id,
                    "player_name": pick.player.common_name,
                },
                "draft": competition_services.get_draft_state(competition),
            },
            status=status.HTTP_201_CREATED,
        )


class SetDraftOrderView(APIView):
    permission_classes = [IsAuthenticated]

    def post(self, request, pk):
        competition = get_object_or_404(Competition, pk=pk)
        serializer = DraftOrderItemSerializer(data=request.data.get("order", []), many=True)
        serializer.is_valid(raise_exception=True)
        try:
            competition_services.set_draft_order(request.user, competition, serializer.validated_data)
        except DjangoValidationError as exc:
            return Response({"detail": str(exc)}, status=status.HTTP_400_BAD_REQUEST)
        return Response(
            CompetitionDetailSerializer(competition, context={"request": request}).data,
            status=status.HTTP_200_OK,
        )


class ActivateCompetitionView(APIView):
    permission_classes = [IsAuthenticated]

    def post(self, request, pk):
        competition = get_object_or_404(Competition, pk=pk)
        try:
            competition = competition_services.activate_without_draft(request.user, competition)
        except DjangoValidationError as exc:
            return Response({"detail": str(exc)}, status=status.HTTP_400_BAD_REQUEST)
        return Response(
            CompetitionDetailSerializer(competition, context={"request": request}).data,
            status=status.HTTP_200_OK,
        )


class CompetitionRostersView(APIView):
    permission_classes = [AllowAny]

    def get(self, request, pk):
        competition = get_object_or_404(Competition, pk=pk)
        rosters = []
        for participant in competition.participants.select_related("team", "team__owner", "user"):
            team = participant.team
            players = RosterEntry.objects.filter(team=team).select_related("player")
            rosters.append({
                "team_id": team.id,
                "team_name": team.name or participant.user.username,
                "username": participant.user.username,
                "players": [
                    {
                        "id": entry.player_id,
                        "name": entry.player.common_name,
                        "overall": entry.player.overall_rating,
                    }
                    for entry in players
                ],
            })
        return Response(rosters)


class CompetitionStandingsView(APIView):
    permission_classes = [AllowAny]

    def get(self, request, pk):
        competition = get_object_or_404(Competition, pk=pk)
        standings = competition_services.get_standings(competition)
        return Response(StandingRowSerializer(standings, many=True).data)


class CompetitionMatchListView(APIView):
    permission_classes = [AllowAny]

    def get(self, request, pk):
        competition = get_object_or_404(Competition, pk=pk)
        matches = competition_services.get_competition_matches(competition)
        return Response(MatchSerializer(matches, many=True).data)


class CompetitionMatchResultView(APIView):
    permission_classes = [IsAuthenticated]

    def post(self, request, pk, match_id):
        competition = get_object_or_404(Competition, pk=pk)
        match = get_object_or_404(Match, pk=match_id, competition=competition)
        serializer = MatchResultSerializer(data=request.data)
        serializer.is_valid(raise_exception=True)
        try:
            match = competition_services.register_competition_match_result(
                request.user,
                competition,
                match,
                home_score=serializer.validated_data["home_score"],
                away_score=serializer.validated_data["away_score"],
                stats=serializer.validated_data.get("stats"),
            )
        except DjangoValidationError as exc:
            return Response({"detail": str(exc)}, status=status.HTTP_400_BAD_REQUEST)
        return Response(MatchSerializer(match).data, status=status.HTTP_200_OK)


class CompetitionSimulateMatchView(APIView):
    permission_classes = [IsAuthenticated]

    def post(self, request, pk, match_id):
        competition = get_object_or_404(Competition, pk=pk)
        match = get_object_or_404(Match, pk=match_id, competition=competition)
        try:
            match = competition_services.simulate_competition_match(request.user, competition, match)
        except DjangoValidationError as exc:
            return Response({"detail": str(exc)}, status=status.HTTP_400_BAD_REQUEST)
        return Response(MatchSerializer(match).data, status=status.HTTP_200_OK)


class GenerateLeagueFixturesView(APIView):
    permission_classes = [IsAuthenticated]

    def post(self, request, pk):
        competition = get_object_or_404(Competition, pk=pk)
        try:
            matches = competition_services.generate_league_fixtures(competition)
        except DjangoValidationError as exc:
            return Response({"detail": str(exc)}, status=status.HTTP_400_BAD_REQUEST)
        return Response(MatchSerializer(matches, many=True).data, status=status.HTTP_201_CREATED)


class MatchListView(generics.ListCreateAPIView):
    queryset = Match.objects.select_related("home_team", "away_team", "competition").all()
    serializer_class = MatchSerializer

    def get_permissions(self):
        if self.request.method == "POST":
            return [IsAdminUser()]
        return [AllowAny()]

    def post(self, request, *args, **kwargs):
        home_team_id = request.data.get("home_team")
        away_team_id = request.data.get("away_team")
        home_score = request.data.get("home_score")
        away_score = request.data.get("away_score")

        if not home_team_id or not away_team_id:
            return Response({"detail": "home_team and away_team are required"}, status=status.HTTP_400_BAD_REQUEST)

        from team.models import Team

        home_team = Team.objects.get(pk=home_team_id)
        away_team = Team.objects.get(pk=away_team_id)

        competition = None
        if request.data.get("competition"):
            competition = Competition.objects.get(pk=request.data.get("competition"))

        if competition is not None and getattr(competition, "campaign", None) is not None:
            try:
                campaign_services._require_admin(request.user, competition.campaign)
            except DjangoValidationError as exc:
                return Response({"detail": str(exc)}, status=status.HTTP_403_FORBIDDEN)

        match = Match.objects.create(competition=competition, home_team=home_team, away_team=away_team)

        if home_score is not None and away_score is not None:
            try:
                stats = []
                for stat in request.data.get("stats") or []:
                    from fifa_data.models import Player

                    stats.append({
                        "player": Player.objects.get(pk=stat["player"]),
                        "team": Team.objects.get(pk=stat["team"]),
                        "goals": stat.get("goals", 0),
                        "assists": stat.get("assists", 0),
                    })
                match = competition_services.register_manual_result(
                    match,
                    int(home_score),
                    int(away_score),
                    stats=stats,
                )
            except DjangoValidationError as exc:
                return Response({"detail": str(exc)}, status=status.HTTP_400_BAD_REQUEST)

        return Response(MatchSerializer(match).data, status=status.HTTP_201_CREATED)


class SimulateMatchView(APIView):
    permission_classes = [IsAdminUser]

    def post(self, request, pk):
        match = get_object_or_404(Match, pk=pk)
        if match.competition and getattr(match.competition, "campaign", None) is not None:
            try:
                campaign_services._require_admin(request.user, match.competition.campaign)
            except DjangoValidationError as exc:
                return Response({"detail": str(exc)}, status=status.HTTP_403_FORBIDDEN)

        try:
            match = competition_services.simulate_match(match)
        except DjangoValidationError as exc:
            return Response({"detail": str(exc)}, status=status.HTTP_400_BAD_REQUEST)

        return Response(MatchSerializer(match).data, status=status.HTTP_200_OK)


class FinishCompetitionView(APIView):
    permission_classes = [IsAuthenticated]

    def post(self, request, pk):
        competition = get_object_or_404(Competition, pk=pk)
        try:
            if competition.campaign_id:
                campaign_services._require_admin(request.user, competition.campaign)
            elif not request.user.is_staff:
                return Response(
                    {"detail": "Apenas administradores podem encerrar esta competição."},
                    status=status.HTTP_403_FORBIDDEN,
                )
            return Response(competition_services.finish_competition(competition))
        except DjangoValidationError as exc:
            return Response({"detail": str(exc)}, status=status.HTTP_400_BAD_REQUEST)


class GenerateBracketView(APIView):
    permission_classes = [IsAuthenticated]

    def post(self, request, pk):
        competition = get_object_or_404(Competition, pk=pk)
        try:
            if request.data.get("team_ids"):
                if competition.campaign_id:
                    campaign_services._require_admin(request.user, competition.campaign)
                elif not request.user.is_staff and competition.created_by_id != request.user.id:
                    return Response(
                        {"detail": "Apenas administradores podem gerar o chaveamento."},
                        status=status.HTTP_403_FORBIDDEN,
                    )
                from team.models import Team

                teams = list(Team.objects.filter(pk__in=request.data.get("team_ids", [])))
                if len(teams) != len(request.data.get("team_ids", [])):
                    return Response({"detail": "Um ou mais times não foram encontrados."}, status=status.HTTP_400_BAD_REQUEST)
                matches = competition_services.generate_bracket(competition, teams)
            else:
                matches = competition_services.generate_cup_bracket(request.user, competition)
            return Response({"matches": BracketMatchSerializer(matches, many=True).data}, status=status.HTTP_201_CREATED)
        except DjangoValidationError as exc:
            return Response({"detail": str(exc)}, status=status.HTTP_400_BAD_REQUEST)


class BracketView(APIView):
    permission_classes = [AllowAny]

    def get(self, request, pk):
        competition = get_object_or_404(Competition, pk=pk)
        rounds = []
        for round_number in competition.matches.exclude(round_number__isnull=True).values_list("round_number", flat=True).distinct().order_by("round_number"):
            matches = competition.matches.filter(round_number=round_number).select_related("home_team", "away_team", "next_match")
            rounds.append({"round_number": round_number, "matches": BracketMatchSerializer(matches, many=True).data})
        return Response({"rounds": rounds})
