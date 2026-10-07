from django.urls import path

from . import views

urlpatterns = [
    path("competitions/", views.CompetitionListView.as_view(), name="competition-list"),
    path("competitions/<int:pk>/", views.CompetitionDetailView.as_view(), name="competition-detail"),
    path("competitions/<int:pk>/settings/", views.CompetitionSettingsView.as_view(), name="competition-settings"),
    path("competitions/<int:pk>/join/", views.JoinCompetitionView.as_view(), name="competition-join"),
    path("competitions/<int:pk>/activate/", views.ActivateCompetitionView.as_view(), name="competition-activate"),
    path("competitions/<int:pk>/draft/", views.DraftStateView.as_view(), name="competition-draft-state"),
    path("competitions/<int:pk>/draft/start/", views.StartDraftView.as_view(), name="competition-draft-start"),
    path("competitions/<int:pk>/draft/order/", views.SetDraftOrderView.as_view(), name="competition-draft-order"),
    path("competitions/<int:pk>/draft/pick/", views.DraftPickView.as_view(), name="competition-draft-pick"),
    path("competitions/<int:pk>/standings/", views.CompetitionStandingsView.as_view(), name="competition-standings"),
    path("competitions/<int:pk>/rosters/", views.CompetitionRostersView.as_view(), name="competition-rosters"),
    path("competitions/<int:pk>/matches/", views.CompetitionMatchListView.as_view(), name="competition-matches"),
    path(
        "competitions/<int:pk>/matches/<int:match_id>/result/",
        views.CompetitionMatchResultView.as_view(),
        name="competition-match-result",
    ),
    path(
        "competitions/<int:pk>/matches/<int:match_id>/simulate/",
        views.CompetitionSimulateMatchView.as_view(),
        name="competition-match-simulate",
    ),
    path(
        "competitions/<int:pk>/generate-fixtures/",
        views.GenerateLeagueFixturesView.as_view(),
        name="competition-generate-fixtures",
    ),
    path("competitions/matches/", views.MatchListView.as_view(), name="match-list"),
    path("competitions/matches/<int:pk>/simulate/", views.SimulateMatchView.as_view(), name="match-simulate"),
    path("competitions/<int:pk>/finish/", views.FinishCompetitionView.as_view(), name="competition-finish"),
    path("competitions/<int:pk>/generate-bracket/", views.GenerateBracketView.as_view(), name="competition-generate-bracket"),
    path("competitions/<int:pk>/bracket/", views.BracketView.as_view(), name="competition-bracket"),
]
