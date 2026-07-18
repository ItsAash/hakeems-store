"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.Migration20260718000000 = void 0;
const migrations_1 = require("@medusajs/framework/mikro-orm/migrations");
class Migration20260718000000 extends migrations_1.Migration {
    async up() {
        this.addSql(`create table if not exists "shipping_zone_node" ("id" text not null, "name" text not null, "code" text not null, "enabled" boolean not null default true, "rate" integer null, "stock_location_id" text not null, "parent_id" text null, "created_at" timestamptz not null default now(), "updated_at" timestamptz not null default now(), "deleted_at" timestamptz null, constraint "shipping_zone_node_pkey" primary key ("id"));`);
        this.addSql('CREATE INDEX IF NOT EXISTS "IDX_shipping_zone_node_deleted_at" ON "shipping_zone_node" (deleted_at) WHERE deleted_at IS NOT NULL;');
    }
    async down() {
        this.addSql('drop table if exists "shipping_zone_node" cascade;');
    }
}
exports.Migration20260718000000 = Migration20260718000000;
