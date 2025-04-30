import {Component, HostListener, Input, OnInit} from '@angular/core';
import {AuthService} from "../../../core/auth/auth.service";
import {MatSnackBar} from "@angular/material/snack-bar";
import {Router} from "@angular/router";
import {CategoryWithTypeType} from "../../../../types/category-with-type.type";
import {CartService} from "../../services/cart.service";
import {DefaultResponseType} from "../../../../types/default-response";
import {ProductService} from "../../services/product.service";
import {ProductType} from "../../../../types/product.type";
import {environment} from "../../../../environments/environment";
import {FormControl} from "@angular/forms";
import {debounceTime} from "rxjs";

@Component({
  selector: 'app-header',
  templateUrl: './header.component.html',
  styleUrls: ['./header.component.scss']
})
export class HeaderComponent implements OnInit {

  isLogged: boolean = false;
  @Input() categories: CategoryWithTypeType[] = [];
  count: number = 0;
  //Переменная для сохранения значений из инпута
  // searchValue: string = '';
  products: ProductType[] = [];
  serverStaticPath = environment.serverStaticPath;
  //Флаг для отслеживания взаимодействия с инпутом поиска
  showedSearch: boolean = false;
  searchField = new FormControl();

  constructor(private authService: AuthService,
              private _snackBar: MatSnackBar,
              private router: Router,
              private cartService: CartService,
              private productService: ProductService,) {

    this.isLogged = this.authService.getIsLoggedIn();
  }

  ngOnInit(): void {
    this.searchField.valueChanges
      .pipe(
        debounceTime(500),
      )
      .subscribe(value => {
        if (value && value.length > 2) {
          this.productService.searchProducts(value)
            .subscribe((data: ProductType[]) => {
              this.products = data;
              this.showedSearch = true;
            });
        } else {
          this.products = [];
        }
      });

    this.authService.isLogged$.subscribe((isLoggedIn: boolean) => {
      this.isLogged = isLoggedIn;
    })

    this.cartService.getCartCount()
      .subscribe((data: {count: number} | DefaultResponseType) => {
        if ((data as DefaultResponseType).error !== undefined) {
          throw new Error((data as DefaultResponseType).message);
        }
        this.count = (data as {count: number}).count;
      });

    this.cartService.count$
      .subscribe(count => {
        this.count = count;
      })
  }

  logout(): void {
    this.authService.logout()
      .subscribe({
        next: () => {
          this.doLogout();
        },
        error: () => {
          this.doLogout();
        }
      })
  }

  doLogout(): void {
    this.authService.removeTokens();
    this.authService.userId = null;
    this._snackBar.open('Вы вышли из системы');
    this.router.navigate(['/']).then();
  }

  // changedSearchValue(newValue: string): void {
  //   this.searchValue = newValue;
  //   if (this.searchValue && this.searchValue.length > 2) {
  //     this.productService.searchProducts(this.searchValue)
  //     .subscribe((data: ProductType[]) => {
  //       this.products = data;
  //       this.showedSearch = true;
  //     });
  //   } else {
  //     this.products = [];
  //   }
  // }

  selectProduct(url: string): void {
    this.router.navigate(['/product/' + url]).then();
    this.searchField.setValue('');
    this.products = [];
  }

  //Метод для изменения значения флага для инпута при потере фокуса
  // changeShowedSearch(value: boolean): void {
  //   setTimeout(() => {
  //     this.showedSearch = value;
  //   }, 100);
  // }

  //Метод обработки клика по странице с отслеживанием клика по блоку с найденными товарами
  @HostListener('document:click', ['$event'])
  click(event: Event): void {
    if (this.showedSearch && (event.target as HTMLInputElement).className.indexOf('search-product') === -1) {
      this.showedSearch = false;
    }
  }

}
