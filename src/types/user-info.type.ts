import {DeliveryType} from "./delivery.type";
import {PaymentType} from "./payment.type";

export type UserInfoType = {
    deliveryType?: DeliveryType,
    firstName?: string,
    lastName?: string,
    fatherName?: string,
    phone?: string,
    email: string,
    paymentType?: PaymentType,
    street?: string,
    house?: string,
    entrance?: string,
    apartment?: string
}
