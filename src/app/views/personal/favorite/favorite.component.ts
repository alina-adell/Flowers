import {Component, OnInit} from '@angular/core';
import {FavoriteService} from "../../../shared/services/favorite.service";
import {FavoriteType} from "../../../../types/favorite.type";
import {DefaultResponseType} from "../../../../types/default-response";
import {environment} from "../../../../environments/environment";

@Component({
  selector: 'app-favorite',
  templateUrl: './favorite.component.html',
  styleUrls: ['./favorite.component.scss']
})
export class FavoriteComponent implements OnInit {

  products: FavoriteType[] = [];
  serverStaticPath: string = environment.serverStaticPath;
  constructor(private favoriteService: FavoriteService) { }

  ngOnInit(): void {
    this.favoriteService.getFavorites()
        .subscribe((data: FavoriteType[] | DefaultResponseType) => {
          //(data as DefaultResponseType) !== undefined  это в условии не работает
          if ((data as DefaultResponseType).error !== undefined) {
            const error = (data as DefaultResponseType).message;
            throw new Error(error);
          }

          this.products = data as FavoriteType[];
        });
  }

  removeFromFavorites(id: string): void {
    this.favoriteService.removeFavorite(id)
        .subscribe((data: DefaultResponseType) => {
          if (data.error) {
            //..
            throw new Error(data.message);
          }

          //Удаляем из массива продукт по его id
          this.products = this.products.filter(item => item.id !== id);
        });
  }

}
