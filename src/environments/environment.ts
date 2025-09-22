// This file can be replaced during build by using the `fileReplacements` array.
// `ng build --prod` replaces `environment.ts` with `environment.prod.ts`.
// The list of file replacements can be found in `angular.json`.

export const environment = {
  production: false,
  spotify: {
    title: 'Album anniversaries dev',
    redirectUrl: 'https://4200-firebase-album-anniversaries-1758421714592.cluster-qewex6ficndhsr4lj7gyhcsnbe.cloudworkstations.dev/'
  },
  firebase: {
    apiKey: 'AIzaSyDNwMtOBcQFPxpdHwsXyC98IfcYP8qiZ70',
    authDomain: 'album-anniversaries.firebaseapp.com',
    databaseURL: 'https://album-anniversaries.firebaseio.com',
    projectId: 'album-anniversaries',
    storageBucket: 'album-anniversaries.appspot.com',
    messagingSenderId: '869867999570'
  }
};

/*
 * For easier debugging in development mode, you can import the following file
 * to ignore zone related error stack frames such as `zone.run`, `zoneDelegate.invokeTask`.
 *
 * This import should be commented out in production mode because it will have a negative impact
 * on performance if an error is thrown.
 */
// import 'zone.js/dist/zone-error';  // Included with Angular CLI.
