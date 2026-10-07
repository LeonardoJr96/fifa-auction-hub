from rest_framework import serializers

from campaigns.models import MatchPlayerStat

from .models import Competition, DraftPick, DraftSession, Match, Participant


class ParticipantSerializer(serializers.ModelSerializer):
    username = serializers.CharField(source="user.username", read_only=True)

    class Meta:
        model = Participant
        fields = ["id", "user", "username", "team", "joined_at", "draft_slot"]


class CompetitionListSerializer(serializers.ModelSerializer):
    participant_count = serializers.SerializerMethodField()
    is_joined = serializers.SerializerMethodField()
    created_by_username = serializers.CharField(
        source="created_by.username",
        read_only=True,
        allow_null=True,
    )

    class Meta:
        model = Competition
        fields = [
            "id",
            "name",
            "description",
            "competition_type",
            "status",
            "draft_mode",
            "draft_order_mode",
            "draft_seed",
            "league_double_round",
            "league_win_points",
            "league_draw_points",
            "league_loss_points",
            "max_participants",
            "draft_rounds",
            "participant_count",
            "is_joined",
            "created_by_username",
            "created_at",
            "is_active",
        ]

    def get_participant_count(self, obj):
        return obj.participants.count()

    def get_is_joined(self, obj):
        request = self.context.get("request")
        if not request or not request.user.is_authenticated:
            return False
        return obj.participants.filter(user=request.user).exists()


class CompetitionDetailSerializer(CompetitionListSerializer):
    participants = ParticipantSerializer(many=True, read_only=True)

    class Meta(CompetitionListSerializer.Meta):
        fields = CompetitionListSerializer.Meta.fields + ["participants"]


class CompetitionCreateSerializer(serializers.ModelSerializer):
    class Meta:
        model = Competition
        fields = [
            "name",
            "description",
            "competition_type",
            "draft_mode",
            "draft_order_mode",
            "draft_seed",
            "max_participants",
            "draft_rounds",
            "league_double_round",
            "league_win_points",
            "league_draw_points",
            "league_loss_points",
        ]


class DraftPickSerializer(serializers.ModelSerializer):
    username = serializers.CharField(source="participant.user.username", read_only=True)
    player_name = serializers.CharField(source="player.common_name", read_only=True)
    player_overall = serializers.IntegerField(source="player.overall_rating", read_only=True)

    class Meta:
        model = DraftPick
        fields = [
            "id",
            "pick_number",
            "participant",
            "username",
            "player",
            "player_name",
            "player_overall",
            "picked_at",
        ]


class DraftStateSerializer(serializers.Serializer):
    competition_id = serializers.IntegerField()
    session_status = serializers.CharField()
    current_pick_index = serializers.IntegerField()
    total_picks = serializers.IntegerField()
    current_participant_id = serializers.IntegerField(allow_null=True)
    current_username = serializers.CharField(allow_null=True)
    is_my_turn = serializers.BooleanField()
    picks = DraftPickSerializer(many=True)

    def to_representation(self, session: DraftSession):
        competition = self.context.get("competition") or session.competition
        request = self.context.get("request")
        pick_order = session.pick_order or []
        current_participant_id = None
        current_username = None
        if session.current_pick_index < len(pick_order):
            current_participant_id = pick_order[session.current_pick_index]
            participant = (
                Participant.objects.filter(pk=current_participant_id)
                .select_related("user")
                .first()
            )
            if participant:
                current_username = participant.user.username

        is_my_turn = False
        if request and request.user.is_authenticated and current_participant_id:
            is_my_turn = Participant.objects.filter(
                pk=current_participant_id,
                user=request.user,
            ).exists()

        picks = session.picks.select_related("participant__user", "player").all()
        return {
            "competition_id": competition.id,
            "session_status": session.status,
            "current_pick_index": session.current_pick_index,
            "total_picks": len(pick_order),
            "current_participant_id": current_participant_id,
            "current_username": current_username,
            "is_my_turn": is_my_turn,
            "picks": DraftPickSerializer(picks, many=True).data,
        }


class MatchPlayerStatSerializer(serializers.ModelSerializer):
    player_name = serializers.CharField(source="player.common_name", read_only=True)

    class Meta:
        model = MatchPlayerStat
        fields = ["id", "player", "player_name", "team", "goals", "assists"]


class MatchSerializer(serializers.ModelSerializer):
    home_team_name = serializers.SerializerMethodField()
    away_team_name = serializers.SerializerMethodField()
    player_stats = MatchPlayerStatSerializer(many=True, read_only=True)

    class Meta:
        model = Match
        fields = [
            "id",
            "competition",
            "home_team",
            "away_team",
            "home_team_name",
            "away_team_name",
            "home_score",
            "away_score",
            "status",
            "played_at",
            "round_number",
            "next_match",
            "next_match_slot",
            "player_stats",
        ]

    def _team_name(self, team):
        if team is None:
            return None
        if team.name:
            return team.name
        return getattr(team.owner, "username", str(team.id))

    def get_home_team_name(self, obj):
        return self._team_name(obj.home_team)

    def get_away_team_name(self, obj):
        return self._team_name(obj.away_team)


class BracketMatchSerializer(MatchSerializer):
    home_team = serializers.PrimaryKeyRelatedField(read_only=True)
    away_team = serializers.PrimaryKeyRelatedField(read_only=True)
    next_match = serializers.PrimaryKeyRelatedField(read_only=True)


class StandingRowSerializer(serializers.Serializer):
    position = serializers.IntegerField()
    team_id = serializers.IntegerField()
    team_name = serializers.CharField()
    username = serializers.CharField()
    points = serializers.IntegerField()
    played = serializers.IntegerField()
    wins = serializers.IntegerField()
    draws = serializers.IntegerField()
    losses = serializers.IntegerField()
    goals_for = serializers.IntegerField()
    goals_against = serializers.IntegerField()
    goal_diff = serializers.IntegerField()


class DraftOrderItemSerializer(serializers.Serializer):
    participant = serializers.IntegerField()
    draft_slot = serializers.IntegerField(min_value=1)


class MatchResultSerializer(serializers.Serializer):
    home_score = serializers.IntegerField(min_value=0)
    away_score = serializers.IntegerField(min_value=0)
    stats = serializers.ListField(child=serializers.DictField(), required=False)
