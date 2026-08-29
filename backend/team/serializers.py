from rest_framework import serializers
from fifa_data.serializers import PlayerSerializer
from .models import Team, TacticSlot, FormationSlot, PortfolioListing


class FormationSlotSerializer(serializers.ModelSerializer):
    class Meta:
        model = FormationSlot
        fields = ["slot_code", "label", "x", "y", "order"]


class TacticSlotSerializer(serializers.ModelSerializer):
    player = PlayerSerializer(read_only=True)

    class Meta:
        model = TacticSlot
        fields = ["slot_code", "player"]


class TeamSerializer(serializers.ModelSerializer):
    slots = TacticSlotSerializer(many=True, read_only=True)
    formation_layout = serializers.SerializerMethodField()
    balance = serializers.DecimalField(source='owner.balance', max_digits=12, decimal_places=2, read_only=True)
    player_count = serializers.IntegerField(source='roster_entries.count', read_only=True)

    class Meta:
        model = Team
        fields = ["id", "name", "formation", "balance", "player_count", "slots", "formation_layout", "updated_at"]

    def get_formation_layout(self, obj):
        layout = FormationSlot.objects.filter(formation=obj.formation)
        return FormationSlotSerializer(layout, many=True).data


class PortfolioListingSerializer(serializers.ModelSerializer):
    player = PlayerSerializer(read_only=True)
    seller_username = serializers.CharField(source="seller.username", read_only=True)
    buyer_username = serializers.CharField(source="buyer.username", read_only=True, allow_null=True)
    auction_id = serializers.IntegerField(source="auction.id", read_only=True, allow_null=True)

    class Meta:
        model = PortfolioListing
        fields = [
            "id",
            "listing_type",
            "price",
            "status",
            "is_active",
            "player",
            "seller_username",
            "buyer_username",
            "auction_id",
            "created_at",
        ]


class PortfolioSerializer(serializers.Serializer):
    players = PlayerSerializer(many=True)
    my_listings = PortfolioListingSerializer(many=True)
    incoming_offers = PortfolioListingSerializer(many=True)


class CreateAuctionListingSerializer(serializers.Serializer):
    player_id = serializers.IntegerField()
    price = serializers.DecimalField(max_digits=25, decimal_places=2)
    duration_minutes = serializers.IntegerField(min_value=5, max_value=10080, default=60)
    min_increment = serializers.DecimalField(max_digits=25, decimal_places=2, default=1)


class CreateDirectListingSerializer(serializers.Serializer):
    player_id = serializers.IntegerField()
    buyer_id = serializers.IntegerField()
    price = serializers.DecimalField(max_digits=25, decimal_places=2)
