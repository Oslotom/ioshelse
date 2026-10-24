# VITAL · Expo

Norsk iPhone-app for aktivitet, puls, søvn og trender. Bygget med **Expo SDK 58, React Native og TypeScript**, med native HealthKit via `@kingstinct/react-native-healthkit`.

Expo-prosjekt: [oslotom/helse](https://expo.dev/accounts/oslotom/projects/helse)

Project ID: `e8e188fb-bcf6-4a36-b7b6-c63d80a1ac1e`

iOS bundle identifier: `no.oslotom.vital`

## Kom i gang

Bruk Node.js 22 LTS eller nyere. Fra prosjektroten:

```sh
npm ci
npm run start:go
```

Installer Expo Go fra App Store på iPhonen, ha telefon og datamaskin på samme Wi-Fi, og skann QR-koden med kameraet. Velg **Bruk iPhonens skritteller** og gi tilgang til **Bevegelse og trening**. Dette gir ekte skritt på en fysisk iPhone uten Apple Developer-konto eller eget EAS-bygg. Eksisterende brukere kan velge samme knapp under **Innstillinger → Datakilde**.

Skritt fra `expo-sensors`/Core Motion er en separat kilde fra Apple Helse: de inkluderer ikke skritt fra Apple Watch eller andre HealthKit-kilder. Dagens total, timefordeling og seks tidligere kalenderdager hentes fra sensorhistorikken. Lengre historikk, forrige ukes sammenligning, distanse, energi, treningsminutter, puls, HRV, søvn og treningsøkter blir ikke estimert eller fylt med eksempler. Bare dag/uke kan velges i sensoranalysen. En ekte måling på null skritt vises som null.

Ved avslag: åpne iPhone-innstillingene og gi Expo Go tilgang til Bevegelse og trening. I Expo Go viser tillatelsesdialogen vertsappens navn/tekst; `app.json` setter norsk bevegelsesbeskrivelse for egne native VITAL-bygg. Simulatorer og andre enheter uten en tilgjengelig skritteller viser en forklaring.

**Utforsk med demodata** gir en tydelig merket demonstrasjon med 400 dagers aktivitet. Modusbytte tømmer den gamle oversikten, og feil eller manglende tilgang bytter aldri automatisk til demodata. Puls, søvn og andre Apple Helse-målinger krever fortsatt et native iOS-bygg med HealthKit. Dette er valgfritt for skritt i Expo Go.

Oppdatering skjer ved åpning/aktivering, trekk-for-å-oppdatere og sensormeldinger i forgrunnen, maksimalt én sensorutløst oppdatering per 30 sekunder. Verdiene fra `watchStepCount` telles fra abonnementets start og legges derfor aldri til historiske totaler; appen henter nye, absolutte intervallmålinger. Ingen bakgrunnsovervåking eller lagring av skritthistorikk utover sensorens sju dager.

## Importer eldre skritthistorikk uten Apple Developer-konto

1. Åpne **Helse** på iPhone → profilbildet → **Eksporter alle helsedata**. Lagre eksporten i **Filer**.
2. Åpne VITAL i Expo Go → **Innstillinger → Importer skritthistorikk → Velg eksportfil**. Velg `export.zip`, eller den utpakkede `export.xml`.
3. Velg én skrittkilde (for eksempel din iPhone eller Apple Watch), kontroller forhåndsvisningen og trykk **Importer skritthistorikk**. Import kan også startes fra introduksjonsskjermen.
4. Åpne skrittanalysen fra Oversikt/Aktivitet. Bruk **Historikk til og med** for å velge dato, og Dag/Uke/Måned/6 md./År for intervallet. Importerte timesummer er gruppert etter målingens starttime.

Denne importen tar kun med skritt, ikke puls, søvn, energi eller treningsøkter. Den henter et øyeblikksbilde og oppdaterer ikke Apple Helse. Veksle mellom **Vis lagret import**, **Bruk iPhonens skritteller** og demomodus under Innstillinger. Kildene blandes aldri. Importen kan leses igjen etter omstart; en ny import erstatter den forrige, og avbrutt/ugyldig import erstatter ingenting. **Slett lagret import** sletter bare lokale importdata, aldri originalfilen eller Apple Helse.

ZIP/XML leses i små biter på enheten. Bare skrittmålinger fra valgt kilde lagres i lokal SQLite; den midlertidige filkopien slettes etter lesing. Rå XML, ruter, kliniske data og andre målinger lagres ikke. Ingen data lastes opp. Maksimal filstørrelse og utpakket XML er 512 MB, med opptil 400 000 gyldige skrittmålinger og 100 kilder. Store eksporter kan ta tid; lesingen kan avbrytes.

For å unngå dobbelttelling velges én kilde/enhet, eksakte duplikater fjernes, og overlappende intervaller fra samme kilde utelates med antallet vist i forhåndsvisningen. Skritt plasseres på intervallets startdato/-time i telefonens tidssone. Ingen fordeling over timer/dager estimeres. Summene kan derfor avvike fra Helse-appens sammenslåtte og kildeprioriterte totaler. Importen er heller ikke en automatisk sikkerhetskopi: behold eksportfilen i Filer ved bytte av telefon eller sletting av Expo Go.

## Hvis appen blir stående på «Åpner VITAL …»

Oppdater til siste `main`, kjør `npm ci`, stopp gammel Metro med Ctrl+C og start `npm run start:go -- --clear`. Lukk og åpne prosjektet i Expo Go igjen. Oppstarten venter maksimalt fem sekunder på preferanser; importdatabasen lastes deretter i bakgrunnen og har en egen tidsgrense. Feil vises i appen uten å slette importert historikk. SQLite, dokumentvelger og filsystem lastes ved behov. Ikke slett Expo Go eller appdata som første feilsøkingstiltak, siden det kan fjerne lokal historikk.

## Graffilter og minimering på Oversikt

Under KPI-kortene velger du dato og Dag/Uke/Måned. Uke og Måned betyr henholdsvis sju og 30 kalenderdager til og med valgt dato. Valget oppdaterer skritt, puls, energi/trening/distanse, søvn og skritttrenden samtidig. Skrittellermodus tilbyr bare Dag/Uke og datoer innenfor tilgjengelig sjudagershistorikk; eldre dager utenfor lastede data står tomme, uten estimater. Dagvis skrittgraf viser timesummer hvis de er lastet inn, ellers merket døgnsum. Siste valgte dag kan være ufullstendig.

Trykk på overskriften i et grafkort for å minimere/utvide det. Minimerte kort beholder en kort oppsummering; dato- og periodevalget gjelder fortsatt. Grafene kan berøres uten å minimere kortet. Egne knapper åpner skritt- og pulsanalysen. Sammenligninger krever komplette registrerte kalenderdager i begge perioder og utelater dagens ufullstendige tall. Søvn viser natten eller snittet av registrerte netter i valgt periode. KPI-kortene bruker sine egne oppgitte journalperioder og påvirkes ikke av graffilteret.

## Form og registreringer

Bunnmenyen har **Oversikt · Aktivitet · + · Søvn · Form**. Plussknappen åpner et panel nedenfra uten å bytte fane. **Trender** finnes via diagramikonet øverst i Aktivitet, og **Innstillinger** via profil-/tannhjulikonet.

- **Dagens form**: egen vurdering fra Svært dårlig til Svært god, tidspunkt og valgfritt notat.
- **Start trening**: velg Gåtur, Løping, Sykling, Styrke eller Annet og start tidtaking. Den pågående økten vises i Form og kan avsluttes og lagres eller forkastes. Starttidspunktet lagres, slik at tiden inkluderer bakgrunn og omstart. Dette er tidtaking uten GPS, puls eller kaloriberegning.
- **Logg blodsukker**: manuelt innlagt måleverdi i mmol/L, tidspunkt, måltidssituasjon og valgfritt notat. Desimalkomma støttes. Appen måler eller tolker ikke blodsukker.

Oversikt viser øverst fire KPI-kort: registreringer i dag, snittform fra registrerte egenvurderinger siste sju kalenderdager, avsluttet treningstid i samme periode og sist manuelt loggede blodsukker med opprinnelig tidspunkt. Framtidige logger og pågående trening telles ikke med. Økter som krysser periodegrensen teller bare tiden innenfor perioden. Manglende data vises uten oppdiktede verdier. Kortene bruker hele journalen, uavhengig av historikkfilteret.

Form viser kronologisk historikk med filtre for form, trening og blodsukker. Etter lagring åpnes Form. Enkelte registreringer kan slettes etter bekreftelse. Egne logger er adskilt fra både demodata, HealthKit og importert skritthistorikk; de skrives ikke til Apple Helse. Kun én treningsklokke kan være aktiv. Doble lagringsforespørsler med samme ID gir ikke duplikater.

Journalen lagres lokalt med AsyncStorage under en egen nøkkel og leses uten å blokkere appens oppstart. Endringer lagres sekvensielt før visningen oppdateres; feil eller ugyldig lagring erstattes ikke automatisk med en tom logg. Maksimalt 10 000 registreringer og 500 tegn per notat. Tester dekker verdier, tidsregning, omstart av økter, samtidige lagringer, feil og databevaring. På fysisk iPhone må du kontrollere plussmeny, tastatur, dato-/tidsvalg, VoiceOver, lagring/omstart, bakgrunnsøkter og sletting.

## Søvn

Søvn har en egen fane i bunnmenyen, med datovalg, registrert søvntid, tidslinje, tilgjengelige faser og sju netters historikk. Manglende netter inngår ikke som null timer i gjennomsnittet. Nattens vindu er lokal kl. 12 dagen før til lokal kl. 12 på valgt dato; grensekryssende intervaller klippes, og overlappende søvntid telles bare én gang. Første/siste registrering er ikke nødvendigvis faktisk legge-/stå-opp-tid. Ingen søvnscore eller diagnoser genereres.

Skrittelleren leverer ikke søvn, og eksportimporten tar foreløpig bare med skritt. Disse modusene viser en forklaring og valg om å bytte hele appen til tydelig merkede demodata. Reelle søvndata kommer fra tilgjengelige HealthKit-registreringer i et native bygg. Faseinndeling vises bare når den finnes. Datovelgeren viser bare søvn som allerede er lastet inn; HealthKit-adapteren laster de siste åtte dagene.

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

Direkte sensor- og HealthKit-målinger holdes i minnet og sendes ikke til en server. Importert skritthistorikk lagres lokalt i SQLite til den erstattes eller slettes. Preferanser og egne Form-registreringer lagres i AsyncStorage. Påminnelser er lokale, valgfrie og inneholder ingen helsemålinger. Ingen kontotjeneste eller analyse-SDK er inkludert.

## Kontroller

```sh
npm run typecheck
npm test
npm run export:ios
npx expo prebuild --platform ios --no-install
```

Automatiske tester for sensoradapteren bruker en kontrollert sensorerstatning og dekker tillatelser, avslag, manglende sensor, forespørselsgrenser, sommertid, målte nullverdier, feil og at kun skritt fylles ut. Testene bruker ikke faktisk iPhone-maskinvare. Importtester dekker strømming av ZIP/XML, kildeskille, enhetsnormalisering, duplikater, overlapp, historiske timesummer, ugyldige filer og blokkering av eksterne XML-entiteter. Øvrige tester dekker demototaler, fremtidige målinger, overlappende søvnintervaller, pulsbrudd, datogrenser, bevegelig snitt, komplette ukesammenligninger, nullbaser, månedssummer og kalenderdager. Kjør også `TZ=Europe/Oslo npm test` for sommertid.

Linux-validering: TypeScript, beregningstester, iOS JavaScript/Hermes-bundling og native prosjektgenerering. Dette erstatter ikke et signert EAS/Xcode-bygg eller testing mot HealthKit på en iPhone.

På fysisk iPhone i Expo Go: godta og avslå Bevegelse og trening, gå noen skritt og oppdater, sjekk dagens total/timefordeling og siste sju dager, gå til bakgrunnen og tilbake, og bytt mellom ekte data og demodata. Kontroller at puls/søvn/energi forblir tomme i sensormodus. Core Motion kan rapportere med forsinkelse og ha andre totaler enn Apple Helse.

Test import på fysisk iPhone: velg en Helse-eksport fra Filer/iCloud, avbryt filvalget og lesingen, velg mellom iPhone og Watch, kontroller forhåndsvisningen, importer og bla til en eldre dato. Start appen på nytt og kontroller lagret historikk, bytt til skritteller/demo og tilbake, og test sletting. Import fra Filer og SQLite-persistens må bekreftes på enheten; parser-/beregningstester i Linux erstatter ikke det.

På enheten: kontroller alle faner, diagramvalg, periodeskifte, mål, miles/km, tema, stor tekst, VoiceOver og Reduser bevegelse. Test manglende/delvis/avslått HealthKit-tilgang, demobytte, forgrunnsoppdatering og varslingstillatelser. Sammenlign reelle summer med Apple Helse. Avklar endelig bundle-ID før distribusjon hvis eksisterende Expo-/Apple-app bruker en annen ID.

## Filer

- `src/App.tsx`: native navigasjon med fire innholdssider, en sentral plussknapp og detaljskjermer.
- `src/screens/`: oversikt, aktivitet, trender, skritt, puls og innstillinger.
- `src/components/`: tilgjengelige diagrammer, kort og designsystem.
- `src/data/`: skritteller- og HealthKit-adaptere, demodata, MVVM-lignende tilstand og beregninger.
- `app.json` / `eas.json`: Expo- og byggekonfigurasjon.
- `legacy/swiftui/`: bevart SwiftUI-prototype. Bruk Expo fra prosjektroten til videre utvikling.

EAS-bygg og faktisk HealthKit-tilgang er ikke kjørt i skyarbeidsområdet. Expo-domener må være tilgjengelige og Expo-/Apple-tilgang må brukes gjennom de offisielle innloggingsflytene. Ikke legg nøkler i kildekoden.
