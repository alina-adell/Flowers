import {HttpEvent, HttpHandler, HttpInterceptor, HttpRequest} from "@angular/common/http";
import {catchError, finalize, Observable, switchMap, throwError} from "rxjs";
import {Injectable} from "@angular/core";
import {AuthService} from "./auth.service";
import {DefaultResponseType} from "../../../types/default-response";
import {LoginResponseType} from "../../../types/login-response";
import {Router} from "@angular/router";
import {LoaderService} from "../../shared/services/loader.service";

@Injectable()
export class AuthInterceptor implements HttpInterceptor {

  constructor(private authService: AuthService,
              private router: Router,
              private loaderService: LoaderService,) {}

  intercept(req: HttpRequest<any>, next: HttpHandler): Observable<HttpEvent<any>> {
    this.loaderService.show();

    const tokens  = this.authService.getTokens();
    if (tokens && tokens.accessToken) {
      //Клонируем запрос req
      const authReq = req.clone({
        headers: req.headers.set('x-access-token', tokens.accessToken)
      });
      //Если токен есть, добавляем его запросу и возвращаем его
      return next.handle(authReq)
        .pipe(
          catchError((error) => {
            //Обработка запроса на 401 ошибку
            if (error.status === 401 && !authReq.url.includes('/login') && !authReq.url.includes('/refresh')) {
              return this.handle401Error(authReq, next);
            }

            return throwError(() => error);
          }),
          //Используем метод завершения запроса
          finalize(() => {
            this.loaderService.hide();
          })
        )
    }
    //Если токена нет, возвращаем запрос
    return next.handle(req)
      .pipe(
        finalize(() => {
          this.loaderService.hide();
        })
      );
  }

  handle401Error(req: HttpRequest<any>, next: HttpHandler) {
    return this.authService.refresh()
      .pipe(
        switchMap((result: DefaultResponseType | LoginResponseType) => {
          let error = '';
          if ((result as DefaultResponseType).error !== undefined) {
            error = (result as DefaultResponseType).message;
          }

          const refreshResult = result as LoginResponseType;
          if (!refreshResult.accessToken || !refreshResult.refreshToken || refreshResult.userId) {
            error = "Ошибка авторизации";
          }

          if (error) {
            //Если есть ошибка, то возвращаем генерацию ошибки throwError типа Observable
            return throwError(() => new Error(error));
          }

          //Записываем токены в локальное хранилище
          this.authService.setTokens(refreshResult.accessToken, refreshResult.refreshToken);

          //Клонируем запрос
          const authReq = req.clone({
            headers: req.headers.set('x-access-token', refreshResult.accessToken)
          });

          return next.handle(authReq);
        }),

        //Обработка ошибки
        catchError(error => {
          this.authService.removeTokens();
          this.router.navigate(['/']).then();
          return throwError(() => error);
        })
      )
  }
}
