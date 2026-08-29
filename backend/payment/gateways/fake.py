from .base import PixGateway


class FakePixGateway(PixGateway):
    def create_charge(self, *, txid, amount, description, user_email, user_document):
        return {
            "pix_payload": f"00020126-FAKE-PIX-{txid}-{amount}",
            "qr_code_base64": "",
            "gateway_payment_id": "",
        }

    def get_payment(self, gateway_payment_id: str) -> dict:
        return {
            "id": gateway_payment_id,
            "status": "pending",
            "external_reference": "",
        }
