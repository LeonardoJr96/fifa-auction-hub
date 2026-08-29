from rest_framework import serializers

from .models import Campaign, MarketWindow, MarketListing, Transfer


class CampaignSerializer(serializers.ModelSerializer):
    starting_balance = serializers.DecimalField(max_digits=12, decimal_places=2, min_value=0, required=False)
    is_member = serializers.SerializerMethodField()
    is_admin = serializers.SerializerMethodField()

    class Meta:
        model = Campaign
        fields = '__all__'

    def get_is_member(self, obj):
        request = self.context.get('request')
        if not request or not request.user.is_authenticated:
            return False
        return obj.memberships.filter(user=request.user).exists()

    def get_is_admin(self, obj):
        request = self.context.get('request')
        if not request or not request.user.is_authenticated:
            return False
        if obj.created_by_id == request.user.id:
            return True
        return obj.admins.filter(user=request.user).exists()


class MarketWindowSerializer(serializers.ModelSerializer):
    class Meta:
        model = MarketWindow
        fields = '__all__'


class MarketListingSerializer(serializers.ModelSerializer):
    player = serializers.SerializerMethodField()

    class Meta:
        model = MarketListing
        fields = '__all__'

    def get_player(self, obj):
        from fifa_data.serializers import PlayerSerializer
        return PlayerSerializer(obj.player, context=self.context).data


class TransferSerializer(serializers.ModelSerializer):
    class Meta:
        model = Transfer
        fields = '__all__'
