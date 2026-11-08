import React, { useMemo, useState } from "react";
import { Pressable, Text, View } from "react-native";
import { exampleWeight } from "../data/weight";
import { dateLabel, number } from "../data/models";
import { Chart } from "../components/Charts";
import { BigValue, Card, Copy, Page, Row, Title, useVitalTheme } from "../components/UI";
export function WeightScreen() {
  const theme = useVitalTheme(), [period, setPeriod] = useState<7 | 30 | 90>(30);
  const all = useMemo(() => exampleWeight(), []), readings = all.slice(-period), latest = all.at(-1)!;
  const change = latest.value - readings[0]!.value;
  return <Page>
    <Card>
      <Title text="Vekt" icon="scale-outline" color={theme.blue} />
      <Copy small>Eksempeldata · ikke dine målinger</Copy>
      <BigValue value={number(latest.value, 1)} unit="kg" />
      <Copy small>Siste eksempelregistrering {dateLabel(latest.date)}</Copy>
      <View style={{ flexDirection: "row", gap: 6 }}>
        {([7, 30, 90] as const).map((days) => <Pressable key={days} accessibilityRole="tab" accessibilityState={{ selected: period === days }} onPress={() => setPeriod(days)}
          style={{ flex: 1, minHeight: 44, borderRadius: 12, alignItems: "center", justifyContent: "center", backgroundColor: period === days ? theme.lightBlue : theme.track }}>
          <Text style={{ color: theme.text, fontWeight: "600" }}>{days} dager</Text>
        </Pressable>)}
      </View>
      <Chart data={readings} line maxGap={36 * 3600000} color={theme.blue} theme={theme} unit="kg" digits={1} />
      <Row label="Endring i valgt periode" value={`${change > 0 ? "+" : ""}${number(change, 1)} kg`} />
      <Row label="Gjennomsnitt" value={`${number(readings.reduce((total, row) => total + row.value, 0) / readings.length, 1)} kg`} />
      <Copy small>Eksempler for å vise utvikling over tid. Ingen målvekt eller medisinsk vurdering.</Copy>
    </Card>
    <Card>
      <Title text="Siste registreringer" icon="list-outline" color={theme.blue} />
      {readings.slice(-14).reverse().map((reading) => <Row key={reading.date} label={dateLabel(reading.date)} value={`${number(reading.value, 1)} kg`} />)}
      <Copy small>Alle oppføringene på denne siden er fiktive.</Copy>
    </Card>
  </Page>;
}
