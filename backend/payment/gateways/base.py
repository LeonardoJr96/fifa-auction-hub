from abc import ABC, abstractmethod


class PixGateway(ABC):
    @abstractmethod
    def create_charge(
        self,
        *,
        txid: str,
        amount,
        description: str,
        user_email: str,
        user_document: str,
    ) -> dict:
        """Return pix_payload, qr_code_base64, gateway_payment_id."""
        raise NotImplementedError

    def get_payment(self, gateway_payment_id: str) -> dict:
        raise NotImplementedError(
            f"{self.__class__.__name__} não consulta status remoto."
        )
