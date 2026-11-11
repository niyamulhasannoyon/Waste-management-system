use serde::{Deserialize, Serialize};
use sqlx::{FromRow, Type};

#[derive(Debug, Clone, Copy, PartialEq, Eq, Serialize, Deserialize, Type)]
#[sqlx(type_name = "zone_type", rename_all = "snake_case")]
#[serde(rename_all = "snake_case")]
pub enum ZoneType {
    MunicipalityWard,
    Union,
}

#[derive(Debug, Serialize, FromRow)]
pub struct ServiceZoneRecord {
    pub id: i32,
    pub code: String,
    pub name_en: String,
    pub name_bn: String,
    pub zone_type: ZoneType,
    pub ward_number: Option<i16>,
    pub centroid_lat: f64,
    pub centroid_lng: f64,
    pub is_active: bool,
}

#[derive(Debug, Deserialize)]
pub struct ResolveZoneQuery {
    pub lat: f64,
    pub lng: f64,
}

#[derive(Debug, Serialize)]
pub struct ResolvedZoneResponse {
    pub ward_id: i32,
    pub code: String,
    pub name_en: String,
    pub name_bn: String,
    pub zone_type: ZoneType,
    pub exact_match: bool,
}
