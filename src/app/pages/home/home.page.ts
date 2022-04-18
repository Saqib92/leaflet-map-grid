import { Component, OnInit, OnDestroy } from '@angular/core';
import { StorageService } from 'src/app/providers/storage.service';
import { GeneralService } from 'src/app/providers/general.service';
import * as Leaflet from 'leaflet';
import { Geolocation } from '@capacitor/geolocation';

@Component({
  selector: 'app-home',
  templateUrl: './home.page.html',
  styleUrls: ['./home.page.scss'],
})
export class HomePage implements OnInit {
  map: Leaflet.Map;
  tiles: any = undefined;

  selectedBoxs = [];
  soldBoxes = [];

  constructor(
    public storage: StorageService,
    public general: GeneralService
  ) { }

  ngOnInit() { }

  ionViewDidEnter() {
    this.loadMap();
    this.map.on('zoomend', (res) => {
      if (res.target._zoom == 20) {
        if (this.tiles == undefined) {
          this.setGrid(this.map);
        }
      } else {
        if (this.tiles != undefined) {
          this.map.removeLayer(this.tiles);
          this.tiles = undefined;
        }
      }
    });

    this.getSoldBox();
  }
  
  getSoldBox() {
    this.storage.getObject('boxes').then((res: any) => {
      if (res != null) {
        this.soldBoxes = res;
      }
    })
  }

  async loadMap() {
    if (this.map !== undefined) {
      return
    }
    this.map = Leaflet.map('mapId').setView([0, 0], 1);
    Leaflet.tileLayer('https://api.mapbox.com/styles/v1/{id}/tiles/{z}/{x}/{y}?access_token={accessToken}', {
      attribution: 'Idevation Saqib Khan',
      maxZoom: 20,
      id: 'mapbox/streets-v11',
      accessToken: 'pk.eyJ1IjoiaWRldmUiLCJhIjoiY2wxZ2o1cnlhMWFjbTNkcGNpbGZ3djI1bSJ9.H-6HJziV9Wu75UT4gQu5Bw',
    }).addTo(this.map);

    const coordinates = await Geolocation.getCurrentPosition();
    this.map.flyTo([coordinates.coords.latitude, coordinates.coords.longitude], 13);

    const icon = Leaflet.icon({
      iconUrl: 'https://res.cloudinary.com/rodrigokamada/image/upload/v1637581626/Blog/angular-leaflet/marker-icon.png',
      shadowUrl: 'https://res.cloudinary.com/rodrigokamada/image/upload/v1637581626/Blog/angular-leaflet/marker-shadow.png',
      popupAnchor: [13, 0],
    });

    const marker = Leaflet.marker([coordinates.coords.latitude, coordinates.coords.longitude], { icon }).bindPopup('Angular Leaflet');
    marker.addTo(this.map);
  }

  setGrid(m) {
    let that = this;
    this.tiles = new Leaflet.GridLayer({
      tileSize: 40,
      opacity: 0.8,
      updateWhenZooming: false,
      updateWhenIdle: false,
      minNativeZoom: 20,
      maxNativeZoom: 25,
    });
    this.tiles.createTile = function (coords) {
      let tile = Leaflet.DomUtil.create('canvas', 'leaflet-tile');
      let ctx = tile.getContext('2d');
      let size = this.getTileSize();
      tile.width = size.x;
      tile.height = size.y;

      // calculate projection coordinates of top left tile pixel
      var nwPoint = coords.scaleBy(size)
      nwPoint.clientHeight = 80;
      nwPoint.clientWidth = 80;
      // calculate geographic coordinates of top left tile pixel
      var nw = m.unproject(nwPoint, coords.z);

      //ctx.fillStyle = 'white';
      //ctx.fillRect(0, 0, size.x, 50);
      //ctx.fillStyle = 'black';
      //ctx.fillText('x: ' + coords.x + ', y: ' + coords.y + ', zoom: ' + coords.z, 20, 20);
      //ctx.fillText('lat: ' + nw.lat + ', lon: ' + nw.lng, 20, 40);

      let fb = undefined;
      fb = that.soldBoxes.find(e => nw.lat == e.lat && nw.lng == e.lng);
      if (fb != undefined) {
        ctx.strokeStyle = 'red';
      } else {
        ctx.strokeStyle = 'grey';
      }
      ctx.beginPath();
      ctx.moveTo(0, 0);
      ctx.lineTo(size.x - 1, 0);
      ctx.lineTo(size.x - 1, size.y - 1);
      ctx.lineTo(0, size.y - 1);
      ctx.closePath();
      ctx.stroke();
      tile.addEventListener('click', (e) => {
        let cb = undefined;
        cb = that.soldBoxes.find(e => nw.lat == e.lat && nw.lng == e.lng);
        if (cb != undefined) {
          return
        }
        let r = undefined;
        r = that.selectedBoxs.filter(e => nw.lat == e.lat && nw.lng == e.lng);
        if (r.length != 0) {
          let i = that.selectedBoxs.findIndex(e => (e.lat == nw.lat && e.lng == nw.lng));
          that.selectedBoxs.splice(i, 1);
          e.srcElement.classList.toggle('border-show');
        } else {
          e.srcElement.classList.toggle('border-show');
          that.selectedBoxs.push({ lat: nw.lat, lng: nw.lng });
        }
      });
      return tile;
    }
    this.tiles.addTo(m);

  }

  async buyNow() {
    let final = [...this.soldBoxes, ...this.selectedBoxs];
    this.storage.setObject('boxes', final);
    this.map.removeLayer(this.tiles);
    this.soldBoxes = [];
    this.selectedBoxs = [];
    this.tiles = undefined;
    this.getSoldBox();
    this.general.presentToast('Boxes bought successfully!');
    setTimeout(() => {
      this.setGrid(this.map);
    })
  } 

  /** Remove map when we have multiple map object */
  ngOnDestroy() {
    this.map.remove();
  }


}