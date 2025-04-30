import {Component, ElementRef, OnInit, TemplateRef, ViewChild} from '@angular/core';
import {CartService} from "../../../shared/services/cart.service";
import {CartType} from "../../../../types/cart.type";
import {DefaultResponseType} from "../../../../types/default-response";
import {MatSnackBar} from "@angular/material/snack-bar";
import {Router} from "@angular/router";
import {DeliveryType} from "../../../../types/delivery.type";
import {FormBuilder, Validators} from "@angular/forms";
import {PaymentType} from "../../../../types/payment.type";
import {MatDialog, MatDialogRef} from "@angular/material/dialog";
import {OrderService} from "../../../shared/services/order.service";
import {OrderType} from "../../../../types/order.type";
import {HttpErrorResponse} from "@angular/common/http";
import {UserService} from "../../../shared/services/user.service";
import {UserInfoType} from "../../../../types/user-info.type";
import {AuthService} from "../../../core/auth/auth.service";

@Component({
  selector: 'app-order',
  templateUrl: './order.component.html',
  styleUrls: ['./order.component.scss']
})
export class OrderComponent implements OnInit {

  cart: CartType | null = null;
  //Общее цена товаров в корзине
  totalAmount: number = 0;
  //Общее количество товаров в корзине
  totalCount: number = 0;
  //Статус доставки
  deliveryType: DeliveryType = DeliveryType.delivery;
  //Дополнительная переменная для хранения перечисленных типов, чтобы использовать в компоненте
  deliveryTypes = DeliveryType;
  //Дополнительная переменная для хранения перечисления типов оплаты (статуса доставки)
  paymentTypes = PaymentType;

  orderForm = this.fb.group({
    firstName: ['', Validators.required],
    lastName: ['', Validators.required],
    phone: ['', Validators.required],
    fatherName: [''],
    paymentType: [PaymentType.cashToCourier, Validators.required],
    email: ['', [Validators.required, Validators.email]],
    street: [''],
    house: [''],
    entrance: [''],
    apartment: [''],
    comment: ['']
  });
  @ViewChild('popup') popup!: TemplateRef<ElementRef>;
  dialogRef: MatDialogRef<any> | null = null;

  constructor(private cartService: CartService,
              private orderService: OrderService,
              private userService: UserService,
              private authService: AuthService,
              private _snackBar: MatSnackBar,
              private router: Router,
              private fb: FormBuilder,
              private dialog: MatDialog) {
    this.updateDeliveryTypeValidation();
  }

  ngOnInit(): void {
    this.cartService.getCart()
        .subscribe((data: CartType | DefaultResponseType) => {
          if ((data as DefaultResponseType).error !== undefined) {
            throw new Error((data as DefaultResponseType).message);
          }

          this.cart = data as CartType;
          if (!this.cart || (this.cart && this.cart.items.length === 0)) {
            this._snackBar.open("Корзина пустая");
            this.router.navigate(['/']).then();
            return;
          }
          this.calculateTotal();
        });

    if (this.authService.getIsLoggedIn()) {
      //Запрашиваем данные пользователя для отображения в полях оформления заказа
      this.userService.getUserInfo()
          .subscribe((data: UserInfoType | DefaultResponseType) => {
            if ((data as DefaultResponseType).error !== undefined) {
              throw new Error((data as DefaultResponseType).message);
            }
            //Сохраняем в переменную данные с нужным типом
            const userInfo = data as UserInfoType;
            const paramsToUpdate = {
              firstName: userInfo.firstName ? userInfo.firstName : '',
              lastName: userInfo.lastName ? userInfo.lastName : '',
              phone: userInfo.phone ? userInfo.phone : '',
              fatherName: userInfo.fatherName ? userInfo.fatherName : '',
              paymentType: userInfo.paymentType ? userInfo.paymentType : PaymentType.cashToCourier,
              email: userInfo.email ? userInfo.email : '',
              street: userInfo.street ? userInfo.street : '',
              house: userInfo.house ? userInfo.house : '',
              entrance: userInfo.entrance ? userInfo.entrance : '',
              apartment: userInfo.apartment ? userInfo.apartment : '',
              comment: '',
            }
            //Вносим в поля формы полученные данные
            this.orderForm.setValue(paramsToUpdate)
            if (userInfo.deliveryType) {
              this.deliveryType = userInfo.deliveryType;
            }
          });
    }
  }

  calculateTotal() {
    this.totalAmount = 0;
    this.totalCount = 0;
    if (this.cart) {
      this.cart.items.forEach(item => {
        this.totalAmount += item.quantity * item.product.price;
        this.totalCount += item.quantity;
      })
    }
  }

  changeDeliveryType(type: DeliveryType) {
    this.deliveryType = type;
    this.updateDeliveryTypeValidation();
  }

  //Метод обновления валидации для формы
  updateDeliveryTypeValidation() {
    //Проверяем какой тип содержится в выборе доставки и устанавливаем валидацию
    if (this.deliveryType === DeliveryType.delivery) {
      this.orderForm.get('street')?.setValidators(Validators.required);
      this.orderForm.get('house')?.setValidators(Validators.required);
    } else {
      this.orderForm.get('street')?.removeValidators(Validators.required);
      this.orderForm.get('house')?.removeValidators(Validators.required);
      this.orderForm.get('street')?.setValue('');
      this.orderForm.get('house')?.setValue('');
      this.orderForm.get('entrance')?.setValue('');
      this.orderForm.get('apartment')?.setValue('');
    }

    //Устанавливаем метод обновления значений и валидации после изменения полей пользователем, чтобы сработала валидация
    this.orderForm.get('street')?.updateValueAndValidity();
    this.orderForm.get('house')?.updateValueAndValidity();
  }

  createOrder() {
    if (this.orderForm.valid && this.orderForm.value.firstName && this.orderForm.value.lastName
        && this.orderForm.value.phone && this.orderForm.value.paymentType && this.orderForm.value.email) {
      //В отдельную переменную помещаем нужные значения

      const paramsObject: OrderType = {
        deliveryType: this.deliveryType,
        firstName: this.orderForm.value.firstName,
        lastName: this.orderForm.value.lastName,
        phone: this.orderForm.value.phone,
        paymentType: this.orderForm.value.paymentType,
        email: this.orderForm.value.email,
      };

      //Также добавляем необязательные поля, если в них есть значения
      if (this.deliveryType === DeliveryType.delivery) {
        if (this.orderForm.value.street) {
          paramsObject.street = this.orderForm.value.street;
        }
        if (this.orderForm.value.house) {
          paramsObject.house = this.orderForm.value.house;
        }
        if (this.orderForm.value.entrance) {
          paramsObject.entrance = this.orderForm.value.entrance;
        }
        if (this.orderForm.value.apartment) {
          paramsObject.apartment = this.orderForm.value.apartment;
        }
      }

      if (this.orderForm.value.comment) {
        paramsObject.comment = this.orderForm.value.comment;
      }

      this.orderService.createOrder(paramsObject)
          .subscribe({
            next: (data: OrderType | DefaultResponseType) => {
              if ((data as DefaultResponseType).error !== undefined) {
                throw new Error((data as DefaultResponseType).message);
              }

              //Сохраняем в локальную переменную открытие диалогового окна
              this.dialogRef = this.dialog.open(this.popup);
              this.dialogRef.backdropClick()
                  .subscribe(() => {
                    this.router.navigate(['/']).then();
                  });
              this.cartService.setCount(0);
            },
            error: (errorResponse: HttpErrorResponse) => {
              if (errorResponse.error && errorResponse.error.message) {
                this._snackBar.open(errorResponse.error.message);
              } else {
                this._snackBar.open("Ошибка заказа");
              }
            }
          });
    } else {
      this.orderForm.markAllAsTouched();
      this._snackBar.open("Заполните необходимые поля");
    }
  }

  closePopup() {
    this.dialogRef?.close();
    this.router.navigate(['/']);
  }
}
