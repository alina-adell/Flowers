import {OrderStatusType} from "../../../types/order-status.type";

export class OrderStatusUtil {
    static getStatusAndColor(status: OrderStatusType | undefined | null): {name: string, color: string} {
        let name = 'Новый';
        let color = 'rgba(69, 111, 73, 1)';

        switch (status) {
            case OrderStatusType.delivery:
                name = 'Доставка';
                break;
            case OrderStatusType.cancelled:
                name = 'Отменён';
                color = 'rgba(255, 117, 117, 1)'
                break;
            case OrderStatusType.pending:
                name = 'Обработка';
                break;
            case OrderStatusType.success:
                name = 'Выполнен';
                color = 'rgba(182, 213, 185, 1)';
                break;
        }

        return {name, color};
    }
}
