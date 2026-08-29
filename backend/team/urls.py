from django.urls import path
from .views import (
    MyFormationsView,
    MyTeamView,
    MyRosterView,
    TacticSlotView,
    MyPortfolioView,
    MyListingsView,
    ListingDetailView,
    AcceptDirectOfferView,
    UserSearchView,
)

urlpatterns = [
    path("me/", MyTeamView.as_view()),
    path("me/roster/", MyRosterView.as_view()),
    path("me/bolsa/", MyPortfolioView.as_view()),
    path("me/listings/", MyListingsView.as_view()),
    path("me/listings/<int:listing_id>/", ListingDetailView.as_view()),
    path("me/listings/<int:listing_id>/accept/", AcceptDirectOfferView.as_view()),
    path("users/search/", UserSearchView.as_view()),
    path("me/formations/", MyFormationsView.as_view()),
    path("me/slots/<str:slot_code>/", TacticSlotView.as_view()),
]