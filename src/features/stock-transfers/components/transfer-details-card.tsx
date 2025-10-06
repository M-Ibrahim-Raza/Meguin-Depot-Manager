"use client";

import { type Control } from "react-hook-form";
import { Card, CardContent } from "@/components/ui/card";
import {
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { type StockLocation } from "@/lib/constants";
import { type CreateTransferInput } from "../schemas";
import { DirectionSelector } from "./direction-selector";

type Props = {
  control: Control<CreateTransferInput>;
  fromLocation: StockLocation;
  toLocation: StockLocation;
  onSelectDirection: (from: StockLocation) => void;
};

export function TransferDetailsCard({
  control,
  fromLocation,
  toLocation,
  onSelectDirection,
}: Props) {
  return (
    <Card>
      <CardContent className="grid grid-cols-1 gap-4 p-6 sm:grid-cols-2">
        <DirectionSelector
          fromLocation={fromLocation}
          toLocation={toLocation}
          onSelect={onSelectDirection}
        />
        <FormField
          control={control}
          name="date"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Date</FormLabel>
              <FormControl>
                <Input type="date" {...field} />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />
        <FormField
          control={control}
          name="note"
          render={({ field }) => (
            <FormItem className="sm:col-span-2">
              <FormLabel>Note (optional)</FormLabel>
              <FormControl>
                <Textarea
                  rows={1}
                  placeholder="e.g. Restocking the office shelf"
                  {...field}
                />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />
      </CardContent>
    </Card>
  );
}
