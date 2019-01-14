import { Component, OnInit } from '@angular/core';
import { HttpClient, HttpHeaders } from '@angular/common/http';

import {client_id, redirect_uri, scope, stateKey, artistsUrl } from './constants';

@Component({
  selector: 'app-root',
  templateUrl: './app.component.html',
  styleUrls: ['./app.component.scss']
})
export class AppComponent implements OnInit {
  title = 'spotify-demo';
  params = null;
  accessToken: string;
  user: any;
  artists: Array<any>;
  loading: boolean = false;

  constructor(private http: HttpClient) {}

  ngOnInit() { 
    this.params = this.getHashParams();
    this.accessToken = this.params['access_token'];

    if (this.authError) {
      console.error('There was an error during the authentication');
      return;
    }

    // localStorage.removeItem(stateKey);
    if (this.accessToken) {
      const httpOptions = {
        headers: new HttpHeaders({
          'Authorization': `Bearer ${this.accessToken}`
        })
      };

      // this.http.get('https://api.spotify.com/v1/me', httpOptions)
      //   .subscribe(data => {
      //     console.log(data);
      //     this.user = data;
      //   });
      
      // this.http.get('https://api.spotify.com/v1/me/top/artists?limit=50', httpOptions)
      //   .subscribe(data => {
      //     this.response = data;
      //   });
      this.loading = true;

      this.http.get(artistsUrl)
        .subscribe((data: any) => {
          this.artists = data.items.slice(0, 5);
          let artistIds = this.artists.map(a => a.id);

          // for each artist retrieve the albums (in parallel)
          // this.http.get(`https://api.spotify.com/v1/artists/${artistIds[0]}/albums?include_groups=album`, httpOptions)
          //   .subscribe((data: any) => {
          //     this.artists[0].albums = data.items;
          //     this.loading = false;
          //   });

          this.loading = false;
        });
    }
  }

  get authError(): boolean {
    let state = this.params['state'];
    let storedState = localStorage.getItem(stateKey);
    console.log(this.accessToken, state, storedState);
    return this.accessToken && (state == null || state !== storedState)
  }

  getHashParams(): any {
    let hashParams = {};
    var e, r = /([^&;=]+)=?([^&;]*)/g,
        q = window.location.hash.substring(1);
    while ( e = r.exec(q)) {
       hashParams[e[1]] = decodeURIComponent(e[2]);
    }
    return hashParams;
  }

  generateRandomString(length): string {
    let text = '';
    const possible = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789';
    for (let i = 0; i < length; i++) {
      text += possible.charAt(Math.floor(Math.random() * possible.length));
    }
    return text;
  };

  login() {
    let state = this.generateRandomString(16);
    localStorage.setItem(stateKey, state);
    var url = 'https://accounts.spotify.com/authorize';
    url += '?response_type=token';
    url += `&client_id=${encodeURIComponent(client_id)}`;
    url += `&scope=${encodeURIComponent(scope)}`;
    url += `&redirect_uri=${encodeURIComponent(redirect_uri)}`;
    url += `&state=${encodeURIComponent(state)}`;

    console.log(url);
    window.location.href = url;
  }

}
