import { RouterOutlet } from '@angular/router';
import { CommonModule, formatDate } from '@angular/common';
import {
  Map,
  Position,
  Tile,
  Oasis,
  Animal,
  AnimalData,
  OasisType,
} from './app.model';
import { HttpClient, HttpClientModule } from '@angular/common/http';
import '@angular/compiler';
import { Component, enableProdMode, NgModule, ViewChild } from '@angular/core';
import { platformBrowserDynamic } from '@angular/platform-browser-dynamic';
import { BrowserModule } from '@angular/platform-browser';
import { MatSort, Sort, MatSortModule } from '@angular/material/sort';
import { MatTableDataSource, MatTableModule } from '@angular/material/table';

@Component({
  selector: 'app-root',
  standalone: true,
  imports: [
    RouterOutlet,
    CommonModule,
    HttpClientModule,
    MatTableModule,
    MatSortModule,
  ],
  templateUrl: './app.component.html',
  styleUrl: './app.component.css',
})
export class AppComponent {
  x: number = 0;
  y: number = 0;
  announceSortChange($event: Sort) {
    console.log('sort' + $event.direction + $event.active);
  }
  title = 'porkEnjoyer';
  hits = '';
  oases: Oasis[] = [];
  data: AnimalData[] = [];

  displayedColumns: string[] = [
    'value',
    'totalRes',
    'distance',
    'animals',
    'resInOasis',
    'link',
    'steppesNeeded',
    'marksNeeded',
  ];

  dataSource: any;

  @ViewChild(MatSort) sort: MatSort = new MatSort();

  ngAfterViewInit() {}

  private httpClient: HttpClient;

  constructor(http: HttpClient) {
    this.httpClient = http;
    this.readData();
  }

  calc(map: string, x: string, y: string) {
    let obj: Map = JSON.parse(map);
    this.x = parseInt(x);
    this.y = parseInt(y);

    obj.tiles.forEach((t: Tile) =>
      this.isNew(this.parse(t)) ? this.oases.push(this.parse(t)) : null
    );

    this.hits = '';
    this.dataSource = new MatTableDataSource(this.oasesToGrid());
    this.dataSource.sort = this.sort;
  }

  oasesToGrid() {
    console.log(this.oases);

    let dataSource: {
      resInOasis: number;
      animals: string;
      steppesNeeded: number;
      marksNeeded: number;
      totalRes: number;
      distance: number;
      value: number;
      link: string;
    }[] = [];

    this.oases.forEach((o: Oasis) => {
      let row = {
        resInOasis: Math.round(o.currentRes),
        animals: this.animalToString(o.animals),
        steppesNeeded: Math.round(o.currentRes / 75),
        marksNeeded: Math.round(o.currentRes / 105),
        totalRes: Math.round(o.currentRes + this.animalToRes(o.animals)),
        distance: Math.round(this.calcDistance(o.position)),
        value: 0,
        link: this.getLink(o.position),
      };

      row.value = Math.round(row.totalRes / row.distance);

      if (row.value > 0) {
        dataSource.push(row);
      }
    });

    return dataSource;
  }

  getLink(position: Position) {
    return (
      'https://ts9.x1.international.travian.com/karte.php?x=' +
      position.x +
      '&y=' +
      position.y
    );
  }

  calcDistance(position: Position) {
    let xDist = Math.min(
      Math.abs(position.x - this.x),
      401 - Math.abs(position.x - this.x)
    );
    let yDist = Math.min(
      Math.abs(position.y - this.y),
      401 - Math.abs(position.y - this.y)
    );

    return Math.sqrt(xDist * xDist + yDist * yDist);
  }

  animalToRes(animals: Animal[]) {
    let sum = 0;
    animals.forEach((a: Animal) => {
      let res = this.data.find((v: AnimalData) => v.id == a.id)?.res;
      if (res) {
        sum += a.count * res;
      }
    });
    return sum;
  }

  animalToString(animals: Animal[]) {
    let result = '';
    animals.forEach((a: Animal) => {
      result +=
        a.count +
        ' ' +
        this.data.find((v: AnimalData) => v.id == a.id)?.name +
        ', ';
    });
    return result;
  }

  readData() {
    if (this.data.length) return;

    const fileContent = this.httpClient
      .get('assets/AnimalData.csv', { responseType: 'text' })
      .subscribe((fileContent) => {
        const arr = fileContent.split(/\r?\n/);

        arr.forEach((line: string) => {
          let splitLine = line.split(',');
          this.data.push({
            id: parseInt(splitLine[0]),
            name: splitLine[1],
            cavDeff: parseInt(splitLine[2]),
            res: parseInt(splitLine[3]) * 160,
          });
        });

        console.log(this.data);
      });
  }

  parse(tile: Tile): Oasis {
    let oasis: Oasis = {
      position: tile.position,
      animals: [],
      type: this.getOasisType(tile),
      lastHit: this.getLastHit(tile),
      currentRes: 0,
    };

    oasis.currentRes = this.calculateCurrentRes(oasis);

    for (let i = 31; i < 41; i++) {
      if (tile.text.includes('u' + i)) {
        let value = tile.text
          .substring(tile.text.indexOf('u' + i) + 3)
          .match('[0-9]{1,3}');
        if (value) {
          oasis.animals.push({ id: i, count: parseInt(value[0]) });
        }
      }
    }

    return oasis;
  }

  calculateCurrentRes(oasis: Oasis): number {
    let hoursSinceHit =
      (new Date().getTime() - oasis.lastHit.getTime()) / (1000 * 60 * 60);
    let cap = oasis.type == OasisType.Single ? 1000 : 2000;

    switch (oasis.type) {
      case OasisType.Single50:
        return (
          Math.min(cap, 70 * hoursSinceHit) +
          3 * Math.min(cap, 10 * hoursSinceHit)
        );
      case OasisType.Single:
        return (
          Math.min(cap, 40 * hoursSinceHit) +
          3 * Math.min(cap, 10 * hoursSinceHit)
        );
      case OasisType.Double:
        return (
          2 * Math.min(cap, 40 * hoursSinceHit) +
          2 * Math.min(cap, 10 * hoursSinceHit)
        );
    }
  }

  getLastHit(tile: Tile): Date {
    // today, 08:20 format
    let dateString = tile.text.match('today, [0-9]{2}:[0-9]{2}');
    var date = new Date();

    if (dateString) {
      // formatDate(dateString[0], 'yyyy-MM-dd:', 'en-UK');
      var timeSplit = dateString[0].split(':');

      date = new Date(
        date.getFullYear(),
        date.getMonth(),
        date.getDate(),
        parseInt(timeSplit[0].slice(-2)),
        parseInt(timeSplit[1])
      );
    } else {
      // 14.02.24, 14:58 format
      dateString = tile.text.match(
        '[0-9]{2}.[0-9]{2}.[0-9]{2}, [0-9]{2}:[0-9]{2}'
      );
      if (!dateString) {
        console.log(tile.text);
        return date;
      }
      var dateSplit = dateString[0].split('.');
      var timeSplit = dateString[0].split(':');

      date = new Date(
        parseInt(dateSplit[2].slice(0, 2)) + 2000,
        parseInt(dateSplit[1]) - 1,
        parseInt(dateSplit[0]),
        parseInt(timeSplit[0].slice(-2)),
        parseInt(timeSplit[1])
      );
    }

    return date;
  }

  getOasisType(tile: Tile): OasisType {
    let matchCount = tile.text.split('25%').length - 1;
    switch (matchCount) {
      case 0:
        return OasisType.Single50;
      case 1:
        return OasisType.Single;
      case 2:
        return OasisType.Double;
      default:
        throw new Error('wrong number of regex matches' + tile.text);
    }
  }

  isNew(current: Oasis): boolean {
    if (
      this.oases.filter((old) => {
        return (
          old.position.x == current.position.x &&
          old.position.y == current.position.y
        );
      }).length
    ) {
      return false;
    }

    return true;
  }
}
