# VITAL · Expo

Norsk iPhone-app for aktivitet, puls, søvn og trender. Bygget med **Expo SDK 58, React Native og TypeScript**, med native HealthKit via `@kingstinct/react-native-healthkit`.

Expo-prosjekt: [oslotom/helse](https://expo.dev/accounts/oslotom/projects/helse)

Project ID: `e8e188fb-bcf6-4a36-b7b6-c63d80a1ac1e`

iOS bundle identifier: `no.oslotom.vital`

## Kom i gang

Bruk Node.js 22 LTS eller nyere. Fra prosjektroten:

```sh
npm ci
npm start
```

Velg **Utforsk med demodata** for en tydelig merket demonstrasjon med 400 dagers aktivitet. Demomodus fungerer uten HealthKit og kan også brukes i Expo Go. Faktiske helsemålinger krever et native iOS-bygg; HealthKit er ikke tilgjengelig i Expo Go eller Android. Appen bytter aldri automatisk til falske målinger.

## Bygg med EAS

Prosjektkoblingen, eier og slug ligger allerede i `app.json`. Ingen prosjekt-ID skal opprettes på nytt. Logg inn på Expo med en konto som har tilgang til `oslotom/helse`:

```sh
npx eas login
npx eas project:info
npm run build:development
```

EAS ber om Apple-signering og registrering av iPhone for interne enhetsbygg. Installasjon på en fysisk iPhone krever gyldig signering. Etter installasjon:

```sh
npm start -- --dev-client
```

For iOS Simulator på Mac:

```sh
npx eas build --platform ios --profile simulator
```

For produksjon/TestFlight:

```sh
npm run build:ios
# Send først inn når du selv ønsker publisering:
npx eas submit --platform ios --profile production
```

EAS-profiler: `development` (utviklingsklient), `simulator`, `preview` (intern distribusjon) og `production`. Native `ios/` og `android/` genereres av Expo og sjekkes ikke inn. `.easignore` utelater den gamle SwiftUI-appen slik at EAS bygger Expo-prosjektet.

## HealthKit

HealthKit-pluginen legger til lesebeskrivelse på Bokmål og HealthKit-entitlement ved prebuild. Skrivetilgang og bakgrunnslevering er deaktivert. Appen leser skritt, gå-/løpedistanse, puls, hvilepuls, HRV, aktiv energi, treningsminutter, søvn og treningsøkter. Skritt/distanse/energi hentes via kumulative HealthKit-statistikkspørringer; overlappende råprøver summeres ikke manuelt.

Tillatelsesskjermen kan fullføres uten å gi lesetilgang. Apple skjuler om lesetilgang er avslått, så tomme resultater behandles som manglende data eller tilgang, aldri som bekreftet tilkobling. Puls viser kilde og måletidspunkt. Målepauser over 15 minutter gir brudd i pulslinjen. Søvnfaser kommer bare fra registrerte data, med én kilde valgt etter antall prøver; sovetid beregnes som unionen av overlappende intervaller.

Data oppdateres ved aktivering, manuell oppdatering og HealthKit-endringer i forgrunnen. Daglige summer og hvilepuls hentes for 740 dager; puls/HRV/treningsøkter for 60 dager; søvn for åtte dager. Dagvis skrittanalyse viser dagens timer. År og seks måneder viser månedssummer. Ukesammenligninger bruker hele registrerte dager og utelater dagens ufullstendige tall. Dager uten data inngår ikke i gjennomsnittet.

Helseopplysninger holdes i minnet og sendes ikke til en server. Bare preferanser lagres i AsyncStorage. Påminnelser er lokale, valgfrie og inneholder ingen helsemålinger. Ingen kontotjeneste eller analyse-SDK er inkludert.

## Kontroller

```sh
npm run typecheck
npm test
npm run export:ios
npx expo prebuild --platform ios --no-install
```

Automatiske tester dekker demototaler, fremtidige målinger, overlappende søvnintervaller, pulsbrudd, datogrenser, bevegelig snitt, komplette ukesammenligninger, nullbaser, månedssummer og kalenderdager. Kjør også `TZ=Europe/Oslo npm test` for sommertid.

Linux-validering: TypeScript, beregningstester, iOS JavaScript/Hermes-bundling og native prosjektgenerering. Dette erstatter ikke et signert EAS/Xcode-bygg eller testing mot HealthKit på en iPhone.

På enheten: kontroller alle faner, diagramvalg, periodeskifte, mål, miles/km, tema, stor tekst, VoiceOver og Reduser bevegelse. Test manglende/delvis/avslått HealthKit-tilgang, demobytte, forgrunnsoppdatering og varslingstillatelser. Sammenlign reelle summer med Apple Helse. Avklar endelig bundle-ID før distribusjon hvis eksisterende Expo-/Apple-app bruker en annen ID.

## Filer

- `src/App.tsx`: native navigasjon, fire faner og detaljskjermer.
- `src/screens/`: oversikt, aktivitet, trender, skritt, puls og innstillinger.
- `src/components/`: tilgjengelige diagrammer, kort og designsystem.
- `src/data/`: HealthKit-adapter, demodata, MVVM-lignende tilstand og beregninger.
- `app.json` / `eas.json`: Expo- og byggekonfigurasjon.
- `legacy/swiftui/`: bevart SwiftUI-prototype. Bruk Expo fra prosjektroten til videre utvikling.

EAS-bygg og faktisk HealthKit-tilgang er ikke kjørt i skyarbeidsområdet. Expo-domener må være tilgjengelige og Expo-/Apple-tilgang må brukes gjennom de offisielle innloggingsflytene. Ikke legg nøkler i kildekoden.
