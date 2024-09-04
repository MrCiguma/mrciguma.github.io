import { ActivatedRoute, RouterOutlet } from '@angular/router';
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
import { HttpClient, HttpClientModule, HttpParams } from '@angular/common/http';
import '@angular/compiler';
import {
  Component,
  enableProdMode,
  importProvidersFrom,
  NgModule,
  ViewChild,
} from '@angular/core';
import { MatSort, Sort, MatSortModule } from '@angular/material/sort';
import { MatTableDataSource, MatTableModule } from '@angular/material/table';
import { FormsModule } from '@angular/forms';
import {
  BrowserAnimationsModule,
  provideAnimations,
} from '@angular/platform-browser/animations';

@Component({
  selector: 'app-root',
  standalone: true,
  imports: [
    RouterOutlet,
    CommonModule,
    HttpClientModule,
    MatTableModule,
    MatSortModule,
    FormsModule,
  ],
  templateUrl: './app.component.html',
  styleUrl: './app.component.css',
})
export class AppComponent {
  x: number = 0;
  y: number = 0;
  baseUrl: string = 'https://ts9.x1.international.travian.com/';
  unitsLvl: number = 0;
  basePower: number = 120;
  unitCost: number = 895;
  minUnits: number = 0;
  maxUnits: number = 10000;
  maxLoss: number = 1;
  show: boolean = false;
  consumption: number = 2;
  cavalry: boolean = true;
  capacity: number = 75;
  unitId: number = 4;
  gameSpeed: number = 1;
  showHero: boolean = false;
  fightingStrength: number = 0;
  damageReduction: number = 0;
  minDelay: number = 0;

  parameterList: String[] = [
    'x',
    'y',
    'baseUrl',
    'unitsLvl',
    'basePower',
    'unitCost',
    'minUnits',
    'maxUnits',
    'maxLoss',
    'show',
    'consumption',
    'cavalry',
    'capacity',
    'unitId',
    'gameSpeed',
    'showHero',
    'fightingStrength',
    'damageReduction',
    'unitCalculatedPower',
    'deleteOnClick',
    'minDelay',
  ];
  unitCalculatedPower: number = 0;
  deleteOnClick: boolean = false;

  announceSortChange($event: Sort) {
    console.log($event);
  }
  title = 'porkEnjoyer';
  hits = '';
  oases: Oasis[] = [];
  data: AnimalData[] = [];
  totalClicked = 0;

  displayedColumns: string[] = [
    'value',
    'valueAnimals',
    'totalRes',
    'distance',
    'animals',
    'resInOasis',
    'link',
    'unitsNeeded',
    'suggestedSim',
    'cleanAnimals',
    'heroXpDamage',
    'heroXpTime',
  ];

  dataSource: any;
  rawData: any[] = [];

  @ViewChild(MatSort) sort: MatSort = new MatSort();

  ngAfterViewInit() {}

  private httpClient: HttpClient;

  constructor(http: HttpClient) {
    this.httpClient = http;
    this.readData();
  }

  ngOnInit() {
    this.parameterList.forEach((key) => {
      let queryParam = this.getParamValueQueryString(key.toString());
      if (queryParam) {
        // @ts-ignore
        if (typeof this[key.toString()] == 'number') {
          // @ts-ignore
          this[key as keyof AppComponent] = parseFloat(queryParam);
          return;
        }
        // @ts-ignore
        if (typeof this[key.toString()] == 'boolean') {
          // @ts-ignore
          this[key as keyof AppComponent] = JSON.parse(queryParam);
          return;
        }
        // @ts-ignore
        this[key as keyof AppComponent] = queryParam;
      }
    });
  }

  getParamValueQueryString(
    paramName: string
  ): boolean | string | number | null | undefined {
    const url = window.location.href;
    let paramValue;
    if (url.includes('?')) {
      const httpParams = new HttpParams({ fromString: url.split('?')[1] });
      paramValue = httpParams.get(paramName);
    }
    return paramValue;
  }

  printCurrentParams() {
    let result = '?';
    this.parameterList.forEach((param) => {
      result += `${param}=${this[param as keyof AppComponent]}&`;
    });
    console.log(result);
  }

  calc(map: string) {
    console.log('start' + new Date().toISOString());
    this.printCurrentParams();
    let obj: Map = JSON.parse(map);

    obj.tiles.forEach((t: Tile) => {
      let o = this.parse(t);
      if (o && this.isNew(o)) {
        this.oases.push(o);
      }
    });

    this.hits = 'ww';
    this.rawData = [...this.rawData, ...this.oasesToGrid()];
    this.dataSource = new MatTableDataSource(this.rawData);
    this.dataSource.sort = this.sort;
    console.log(this.oases.length);
    console.log(this.rawData.length);
    console.log('end' + new Date().toISOString());
  }

  oasesToGrid(): any[] {
    let dataSource: {
      resInOasis: number;
      animals: string;
      valueAnimals: number;
      unitsNeeded: number;
      marksNeeded: number;
      totalRes: number;
      distance: number;
      value: number;
      link: string;
      unitsLink: string;
      heroLink: string;
      suggestedSim: Sim;
      suggestedRainbow: Sim;
      cleanAnimals: string[];
    }[] = [];

    this.oases.forEach((o: Oasis) => {
      if (Math.round(o.currentRes + this.animalToRes(o.animals, 1)) < 1) return;
      let mapId = (200 - o.position.y) * 401 + (201 + o.position.x);
      let row = {
        resInOasis: Math.round(o.currentRes),
        animals: this.animalToString(o.animals),
        unitsNeeded: Math.round(o.currentRes / this.capacity),
        marksNeeded: Math.round(o.currentRes / 105),
        totalRes: Math.round(o.currentRes + this.animalToRes(o.animals, 1)),
        distance: Math.round(this.calcDistance(o.position)),
        value: 0,
        valueAnimals: 0,
        link: this.getLink(o.position),
        unitsLink: '',
        heroLink: '',
        suggestedSim: this.getSuggested(
          o.animals,
          Math.round(o.currentRes / this.capacity),
          mapId
        ),
        suggestedRainbow: this.getSuggestedRainbow(
          o.animals,
          Math.round(o.currentRes / (75 + 105 + 80))
        ),
        heroXpDamage: 0,
        heroXpTime: 0,
        heroXp: 0,
        heroDamage: 0,
        cleanAnimals: [],
      };

      row.value =
        (row.resInOasis + row.suggestedSim.bounty - row.suggestedSim.losses) /
        (row.suggestedSim.number * row.distance);
      row.value = Math.round(row.value * 1000);

      row.valueAnimals =
        (row.suggestedSim.bounty - row.suggestedSim.losses) /
        (row.suggestedSim.number * row.distance);
      row.valueAnimals = Math.round(row.valueAnimals * 1000);

      row.unitsLink = `${this.baseUrl}build.php?gid=16&tt=2&eventType=4&targetMapId=${mapId}&troop[t${this.unitId}]=${row.unitsNeeded}`;
      row.heroLink = `${this.baseUrl}build.php?gid=16&tt=2&eventType=4&targetMapId=${mapId}&troop[t11]=1`;

      row.suggestedRainbow.link = `${this.baseUrl}build.php?gid=16&tt=2&eventType=4&targetMapId=${mapId}&troop[t4]=${row.suggestedRainbow.number}&troop[t5]=${row.suggestedRainbow.number}&troop[t6]=${row.suggestedRainbow.number}`;

      row.cleanAnimals = this.cleanAnimals(
        o.animals,
        this.minUnits,
        row.suggestedSim,
        mapId
      );

      let heroSim = this.calcLossHero(o.animals);
      row.heroXp = heroSim[1] / 160;
      row.heroDamage = Math.max(0, heroSim[0] * 100 - this.damageReduction);
      row.heroXpTime = row.heroXp / row.distance;
      row.heroXpDamage =
        row.heroXp / (row.heroDamage == 0 ? 1 : row.heroDamage);

      if (
        row.suggestedSim.number > this.minUnits &&
        row.suggestedSim.number < this.maxUnits &&
        row.value > 0
      ) {
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
      bounty: 0,
      losses: 0,
      offLosses: 0,
    };

    let maxValue = 0;

    let step = 1;

    while (rainbowNumber < 1000) {
      let lossRatio = this.calcLossRatioRainbow(rainbowNumber, animals);
      let losses = lossRatio[1];
      let bounty = lossRatio[2];

      let value = (bounty - losses) / rainbowNumber;

      if (value > maxValue && lossRatio[0] < this.maxLoss) {
        maxValue = value;
        sim.number = rainbowNumber + 1;
        sim.percent = lossRatio[0];
        sim.bounty = bounty;
        sim.losses = losses;
      }

      rainbowNumber += step;
      if (rainbowNumber % 100 < step) {
        step += 2;
      }
    }

    return sim;
  }

  getSuggested(animals: Animal[], minUnits: any, mapId: number): Sim {
    let unitsNumber = minUnits;
    let sim: Sim = {
      link: '',
      number: unitsNumber,
      percent: 0,
      bounty: 0,
      losses: unitsNumber * this.unitCost,
      offLosses: 0,
    };

    let maxValue = 0;

    let step = 1;

    while (unitsNumber < this.maxUnits) {
      let lossRatio = this.calcLossRatio(unitsNumber, animals);
      let losses = lossRatio[1];
      let bounty = lossRatio[2];

      let value = (bounty - losses) / unitsNumber;

      if (value > maxValue && lossRatio[0] < this.maxLoss) {
        maxValue = value;
        sim.number = unitsNumber + 3;
        sim.percent = lossRatio[0];
        sim.bounty = bounty;
        sim.losses = losses;
        sim.offLosses = lossRatio[3];
      }

      unitsNumber += step;
      if (unitsNumber % 100 < step) {
        step += 2;
      }
    }

    sim.link = `${this.baseUrl}build.php?gid=16&tt=2&eventType=4&targetMapId=${mapId}&troop[t${this.unitId}]=${sim.number}`;
    return sim;
  }

  cleanAnimals(
    animals: Animal[],
    minUnits: any,
    firstAttack: Sim,
    mapId: number
  ): any {
    var links: string[] = [];

    links.push(firstAttack.link);
    animals = calculateRemains(animals, 1 - firstAttack.offLosses);

    while (animals.length > 0) {
      let nextAttack = this.getSuggested(animals, minUnits, mapId);
      links.push(nextAttack.link);
      animals = calculateRemains(animals, 1 - nextAttack.offLosses);
    }
    return links;
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
      cost += u.cost;
    });

    offPower *= rainbowNumber * 1.08;

    let deffPower = this.animalToDeff(animals) + 10;

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

  calcLossHero(animals: Animal[]): number[] {
    let offPower = this.fightingStrength;
    let deffPower = this.animalToDeff(animals, true) + 10;
    let offWins = true;
    let ratioX = Math.pow(deffPower / offPower, 1.5);

    if (offPower < deffPower) {
      offWins = false;
      ratioX = Math.pow(offPower / deffPower, 1.5);
    }

    // https://blog.travian.com/2023/09/game-secrets-combat-system-formulas-written-by-kirilloid/
    let losses = ratioX / (1 + ratioX);

    let bounty = this.animalToRes(animals, !offWins ? losses : 1 - losses);
    let result: number[] = [];
    result.push(offWins ? losses : 1 - losses);
    result.push(bounty);
    return result;
  }

  calcLossRatio(unitsNumber: number, animals: Animal[]): number[] {
    // https://blog.travian.com/sl/2023/10/game-secrets-smithy-and-total-strength-of-an-army/
    if (this.unitCalculatedPower <= 0) {
      let upgradeBonus: number =
        (this.basePower + (300 * this.consumption) / 7) *
        (Math.pow(1.007, this.unitsLvl) - 1);
      this.unitCalculatedPower = this.basePower + upgradeBonus;
    }
    let offPower = unitsNumber * this.unitCalculatedPower;
    let deffPower = this.animalToDeff(animals) + 10;

    let offWins = true;
    let ratioX = Math.pow(deffPower / offPower, 1.5);
    if (offPower < deffPower) {
      offWins = false;
      ratioX = Math.pow(offPower / deffPower, 1.5);
    }

    // https://blog.travian.com/2023/09/game-secrets-combat-system-formulas-written-by-kirilloid/
    let losses = ratioX / (1 + ratioX);
    let offLosses = offWins ? losses : 1 - losses;

    let bounty = this.animalToRes(animals, 1 - offLosses);
    let result: number[] = [];
    result.push((Math.round(unitsNumber * offLosses) * this.unitCost) / bounty);
    result.push(Math.round(unitsNumber * offLosses) * this.unitCost);
    result.push(bounty);
    result.push(offLosses);
    return result;
  }

  getLink(position: Position) {
    return `${this.baseUrl}karte.php?x=` + position.x + '&y=' + position.y;
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

  animalToDeff(animals: Animal[], forceCavalry?: boolean) {
    let sum = 0;
    animals.forEach((a: Animal) => {
      let deff = this.data.find((v: AnimalData) => v.id == a.id)?.[
        this.cavalry || forceCavalry ? 'cavDeff' : 'infDeff'
      ];
      if (deff) {
        sum += a.count * deff;
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
            infDeff: parseInt(splitLine[2]),
            cavDeff: parseInt(splitLine[3]),
            res: parseInt(splitLine[4]) * 160,
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
    if (oasis.currentRes == -1) {
      return null;
    }

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

    if (hoursSinceHit < this.minDelay && hoursSinceHit > 0) {
      return -1;
    }
    let cap = oasis.type == OasisType.Single ? 1000 : 2000;

    switch (oasis.type) {
      case OasisType.Single50:
        return (
          Math.min(cap, 70 * hoursSinceHit * this.gameSpeed) +
          3 * Math.min(cap, 10 * hoursSinceHit * this.gameSpeed)
        );
      case OasisType.Single:
        return (
          Math.min(cap, 40 * hoursSinceHit * this.gameSpeed) +
          3 * Math.min(cap, 10 * hoursSinceHit * this.gameSpeed)
        );
      case OasisType.Double:
        return (
          2 * Math.min(cap, 40 * hoursSinceHit * this.gameSpeed) +
          2 * Math.min(cap, 10 * hoursSinceHit * this.gameSpeed)
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

  addToTotalAndDelete(x: number, link: string) {
    this.totalClicked += x;
    if (this.deleteOnClick) {
      this.rawData = this.rawData.filter((a) => a.link != link);
      let sort = this.dataSource.sort;
      this.dataSource = new MatTableDataSource(this.rawData);
      this.dataSource.sort = sort;
    }
  }

  getValue($event: Event): string {
    return ($event.target as HTMLInputElement).value;
  }

  getIntValue($event: Event): number {
    return parseInt(($event.target as HTMLInputElement).value);
  }

  getFloatValue($event: Event): number {
    return parseFloat(($event.target as HTMLInputElement).value);
  }

  handleClick($event: any) {
    this.cavalry = $event.checked;
  }

  shareLink(): string {
    let result = window.location.host + '?';
    this.parameterList.forEach((param) => {
      result += `${param}=${this[param as keyof AppComponent]}&`;
    });
    return result;
  }
}
function calculateRemains(animals: Animal[], losses: number): Animal[] {
  var remaining: Animal[] = [];
  animals.forEach((a) => {
    a.count = Math.round(a.count * (1 - losses));
    if (a.count > 0) {
      remaining.push(a);
    }
  });
  return remaining;
}
