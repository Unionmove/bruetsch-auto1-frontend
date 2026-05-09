import { z } from "zod";
import { publicProcedure, router } from "./trpc";
import {
  getDashboardStats,
  getVehicleDetail,
  listBrands,
  listVehicles,
} from "./auto1Db";

const sortSchema = z
  .enum([
    "price_asc",
    "price_desc",
    "km_asc",
    "km_desc",
    "year_desc",
    "year_asc",
    "ending_soon",
  ])
  .default("ending_soon");

export const auto1Router = router({
  dashboard: publicProcedure.query(() => getDashboardStats()),

  brands: publicProcedure.query(() => listBrands()),

  list: publicProcedure
    .input(
      z.object({
        brand: z.string().optional(),
        priceMin: z.number().optional(),
        priceMax: z.number().optional(),
        kmMin: z.number().optional(),
        kmMax: z.number().optional(),
        yearMin: z.number().optional(),
        yearMax: z.number().optional(),
        search: z.string().optional(),
        sort: sortSchema,
      })
    )
    .query(({ input }) => {
      const { sort, ...filters } = input;
      return listVehicles(filters, sort);
    }),

  detail: publicProcedure
    .input(z.object({ stockNr: z.string().min(1) }))
    .query(({ input }) => {
      const detail = getVehicleDetail(input.stockNr);
      if (!detail) return null;
      return detail;
    }),
});
