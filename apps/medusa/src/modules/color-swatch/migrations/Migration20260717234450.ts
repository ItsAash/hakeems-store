import { Migration } from "@medusajs/framework/mikro-orm/migrations";

export class Migration20260717234450 extends Migration {

  override async up(): Promise<void> {
    this.addSql(`create table if not exists "color_swatch" ("id" text not null, "option_value_id" text not null, "value" text not null, "created_at" timestamptz not null default now(), "updated_at" timestamptz not null default now(), "deleted_at" timestamptz null, constraint "color_swatch_pkey" primary key ("id"));`);
    this.addSql(`CREATE INDEX IF NOT EXISTS "IDX_color_swatch_deleted_at" ON "color_swatch" ("deleted_at") WHERE deleted_at IS NULL;`);
  }

  override async down(): Promise<void> {
    this.addSql(`drop table if exists "color_swatch" cascade;`);
  }

}
