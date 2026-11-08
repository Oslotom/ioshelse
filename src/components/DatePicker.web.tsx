import React from "react";
import type { DateTimePickerEvent } from "@react-native-community/datetimepicker";
type Props = {
  value: Date;
  maximumDate?: Date;
  onChange?: (event: DateTimePickerEvent, date?: Date) => void;
  [key: string]: unknown;
};
const localDay = (date: Date) =>
  `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, "0")}-${String(date.getDate()).padStart(2, "0")}`;
export default function DatePicker({ value, maximumDate, onChange }: Props) {
  return (
    <input
      aria-label="Velg dato"
      type="date"
      value={localDay(value)}
      max={maximumDate ? localDay(maximumDate) : undefined}
      onChange={(event) => {
        if (!event.target.value) return;
        const date = new Date(event.target.value + "T12:00:00");
        onChange?.(
          {
            type: "set",
            nativeEvent: {
              timestamp: +date,
              utcOffset: -date.getTimezoneOffset(),
            },
          },
          date,
        );
      }}
      style={{
        padding: 10,
        border: "1px solid #dde2e8",
        borderRadius: 10,
        font: "inherit",
        maxWidth: "100%",
      }}
    />
  );
}
