# SpotifyDemo

This project was generated with [Angular CLI](https://github.com/angular/angular-cli).

## Development server

Run `ng serve` for a dev server. Navigate to `http://localhost:4200/`. The app will automatically reload if you change any of the source files.

## Code scaffolding

Run `ng generate component component-name` to generate a new component. You can also use `ng generate directive|pipe|service|class|guard|interface|enum|module`.

## Build

Run `ng build` to build the project. The build artifacts will be stored in the `dist/` directory.

## Running unit tests

Run `ng test` to execute the unit tests via [Karma](https://karma-runner.github.io).

## Running end-to-end tests

Run `ng e2e` to execute the end-to-end tests via a platform of your choice. To use this command, you need to first add a package that implements end-to-end testing capabilities.

## Deployment to Firebase Hosting

To deploy this application to Firebase Hosting, follow these steps:

1.  **Install Firebase Tools:**
    If you haven't already, install the Firebase CLI:
    ```bash
    npm install -g firebase-tools
    ```

2.  **Login to Firebase:**
    ```bash
    firebase login
    ```

3.  **Initialize Firebase:**
    In your project root, run:
    ```bash
    firebase init
    ```
    - Select "Hosting: Configure and deploy Firebase Hosting sites".
    - Select an existing Firebase project or create a new one.
    - Set your public directory to `dist/spotify-demo`.
    - Configure as a single-page app (rewrite all urls to /index.html).

4.  **Build and Deploy:**
    ```bash
    ng build --configuration=production
    firebase deploy
    ```

## Further help

To get more help on the Angular CLI use `ng help` or go check out the [Angular CLI README](httpss://github.com/angular/angular-cli/blob/master/README.md).
