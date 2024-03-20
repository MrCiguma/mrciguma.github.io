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
  Sim,
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
  steppesLvl: number = 0;
  basePower: number = 120;
  minSteppes: number = 0;
  announceSortChange($event: Sort) {}
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
    'suggestedSim',
    'suggestedRainbow',
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

  calc(map: string, x: string, y: string, steppesLvl: string, min: string) {
    console.log('start' + new Date().toISOString());
    let obj: Map = JSON.parse(map);
    if (x) this.x = parseInt(x);
    if (y) this.y = parseInt(y);
    if (steppesLvl) this.steppesLvl = parseInt(steppesLvl);
    if (min) this.minSteppes = parseInt(min);

    obj.tiles.forEach((t: Tile) => {
      let o = this.parse(t);
      if (o && this.isNew(o)) {
        this.oases.push(o);
      }
    });

    this.hits = '';
    this.dataSource = new MatTableDataSource(this.oasesToGrid());
    this.dataSource.sort = this.sort;
    console.log('start' + new Date().toISOString());
  }

  oasesToGrid() {
    let dataSource: {
      resInOasis: number;
      animals: string;
      steppesNeeded: number;
      marksNeeded: number;
      totalRes: number;
      distance: number;
      value: number;
      link: string;
      steppesLink: string;
      marksLink: string;
      sims: Sim[];
      suggestedSim: Sim;
      suggestedRainbow: Sim;
    }[] = [];

    this.oases.forEach((o: Oasis) => {
      if (Math.round(o.currentRes + this.animalToRes(o.animals, 1)) < 1) return;
      let row = {
        resInOasis: Math.round(o.currentRes),
        animals: this.animalToString(o.animals),
        steppesNeeded: Math.round(o.currentRes / 75),
        marksNeeded: Math.round(o.currentRes / 105),
        totalRes: Math.round(o.currentRes + this.animalToRes(o.animals, 1)),
        distance: Math.round(this.calcDistance(o.position)),
        value: 0,
        link: this.getLink(o.position),
        steppesLink: '',
        marksLink: '',
        sims: [] as Sim[],
        suggestedSim: this.getSuggested(
          o.animals,
          Math.round(o.currentRes / 75)
        ),
        suggestedRainbow: this.getSuggestedRainbow(
          o.animals,
          Math.round(o.currentRes / (75 + 105 + 80))
        ),
      };

      row.value = Math.round(row.totalRes / row.distance);

      let mapId = (200 - o.position.y) * 401 + (201 + o.position.x);
      row.steppesLink = `https://ts9.x1.international.travian.com/build.php?gid=16&tt=2&eventType=4&targetMapId=${mapId}&troop[t4]=${row.steppesNeeded}`;
      row.marksLink = `https://ts9.x1.international.travian.com/build.php?gid=16&tt=2&eventType=4&targetMapId=${mapId}&troop[t5]=${row.marksNeeded}`;

      row.sims = this.getSims(o.animals, row.steppesNeeded);

      row.sims.forEach((sim) => {
        sim.link = `https://ts9.x1.international.travian.com/build.php?gid=16&tt=2&eventType=4&targetMapId=${mapId}&troop[t4]=${sim.number}`;
      });

      row.suggestedSim.link = `https://ts9.x1.international.travian.com/build.php?gid=16&tt=2&eventType=4&targetMapId=${mapId}&troop[t4]=${row.suggestedSim.number}`;

      row.suggestedRainbow.link = `https://ts9.x1.international.travian.com/build.php?gid=16&tt=2&eventType=4&targetMapId=${mapId}&troop[t4]=${row.suggestedRainbow.number}&troop[t5]=${row.suggestedRainbow.number}&troop[t6]=${row.suggestedRainbow.number}`;

      if (row.suggestedSim.number > this.minSteppes) {
        dataSource.push(row);
      }
    });

    return dataSource;
  }

  getSuggestedRainbow(animals: Animal[], minRainbow: number): Sim {
    let rainbowNumber = minRainbow;
    let sim: Sim = {
      link: '',
      number: rainbowNumber,
      percent: 0,
    };

    let maxValue = 0;

    let step = 1;

    while (rainbowNumber < 333) {
      let lossRatio = this.calcLossRatioRainbow(rainbowNumber, animals);
      let losses = lossRatio[1];
      let bounty = lossRatio[2];

      let value = (bounty - losses) / rainbowNumber;

      if (value > maxValue) {
        maxValue = value;
        sim.number = rainbowNumber + 1;
        sim.percent = lossRatio[0];
      }

      rainbowNumber += step;
    }

    return sim;
  }

  getSuggested(animals: Animal[], minSteppes: any): Sim {
    let steppesNumber = minSteppes;
    let sim: Sim = {
      link: '',
      number: steppesNumber,
      percent: 0,
    };

    let maxValue = 0;

    let step = 1;

    while (steppesNumber < 1000) {
      let lossRatio = this.calcLossRatio(steppesNumber, animals);
      let losses = lossRatio[1];
      let bounty = lossRatio[2];

      let value = (bounty - losses) / steppesNumber;

      if (value > maxValue) {
        maxValue = value;
        sim.number = steppesNumber + 3;
        sim.percent = lossRatio[0];
      }

      steppesNumber += step;
      if (steppesNumber % 100 < step) {
        step += 2;
      }
    }

    return sim;
  }

  getSims(animals: Animal[], minSteppes: number): Sim[] {
    let ratio = 1;
    let steppesNumber = minSteppes;
    let result = [];

    while (steppesNumber < 1000) {
      let lossRatio = this.calcLossRatio(steppesNumber, animals)[0];
      if (lossRatio < ratio) {
        let sim: Sim = {
          link: '',
          number: steppesNumber,
          percent: ratio,
        };
        result.push(sim);
        ratio -= 0.25;
        steppesNumber--;
        if (ratio <= 0) return result;
      }
      steppesNumber++;
    }
    return result;
  }

  calcLossRatioRainbow(rainbowNumber: number, animals: Animal[]): number[] {
    // https://blog.travian.com/sl/2023/10/game-secrets-smithy-and-total-strength-of-an-army/
    let units = [
      {
        basePower: 120,
        consumption: 2,
        level: 20,
        cost: 895,
      },
      {
        basePower: 110,
        consumption: 2,
        level: 20,
        cost: 1050,
      },
      {
        basePower: 120,
        consumption: 2,
        level: 20,
        cost: 1760,
      },
    ];

    let offPower = 0;
    let cost = 0;

    units.forEach((u) => {
      offPower +=
        u.basePower +
        (u.basePower + (300 * u.consumption) / 7) *
          (Math.pow(1.007, u.level) - 1);
      console.log(offPower);
      cost += u.cost;
    });

    offPower *= rainbowNumber * 1.08;

    console.log(offPower);
    console.log(rainbowNumber);
    let deffPower = this.animalToCavDeff(animals) + 10;

    if (offPower < deffPower) return [5, 5, 5];

    // https://blog.travian.com/2023/09/game-secrets-combat-system-formulas-written-by-kirilloid/
    let ratioX = Math.pow(deffPower / offPower, 1.5);
    let losses = ratioX / (1 + ratioX);

    let bounty = this.animalToRes(animals, 1 - losses);
    let result: number[] = [];
    result.push((Math.round(rainbowNumber * losses) * cost) / bounty);
    result.push(Math.round(rainbowNumber * losses) * cost);
    result.push(bounty);
    return result;
  }

  calcLossRatio(steppesNumber: number, animals: Animal[]): number[] {
    // https://blog.travian.com/sl/2023/10/game-secrets-smithy-and-total-strength-of-an-army/
    let offPower =
      steppesNumber *
      (this.basePower +
        (this.basePower + (300 * 2) / 7) *
          (Math.pow(1.007, this.steppesLvl) - 1));
    offPower *= 1.08;
    let deffPower = this.animalToCavDeff(animals) + 10;

    if (offPower < deffPower) return [5, 5, 5];

    // https://blog.travian.com/2023/09/game-secrets-combat-system-formulas-written-by-kirilloid/
    let ratioX = Math.pow(deffPower / offPower, 1.5);
    let losses = ratioX / (1 + ratioX);

    let bounty = this.animalToRes(animals, 1 - losses);
    let result: number[] = [];
    result.push((Math.round(steppesNumber * losses) * 895) / bounty);
    result.push(Math.round(steppesNumber * losses) * 895);
    result.push(bounty);
    return result;
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

  animalToRes(animals: Animal[], ratio: number): number {
    let sum = 0;
    animals.forEach((a: Animal) => {
      let res = this.data.find((v: AnimalData) => v.id == a.id)?.res;
      if (res) {
        sum += Math.round(a.count * ratio) * res;
      }
    });
    return sum;
  }

  animalToCavDeff(animals: Animal[]) {
    let sum = 0;
    animals.forEach((a: Animal) => {
      let cavDeff = this.data.find((v: AnimalData) => v.id == a.id)?.cavDeff;
      if (cavDeff) {
        sum += a.count * cavDeff;
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
      });
  }

  parse(tile: Tile): Oasis | null {
    if (tile.did != -1) {
      return null;
    }
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
      case OasisType.Occupied:
        return 0;
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
    let occupied = tile.text.includes('spieler');
    if (occupied) return OasisType.Occupied;

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
