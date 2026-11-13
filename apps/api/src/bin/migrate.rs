use clean_savar_api::db::init_pool;

#[tokio::main]
async fn main() -> Result<(), Box<dyn std::error::Error>> {
    dotenvy::dotenv().ok();
    let database_url = std::env::var("DATABASE_URL")
        .expect("DATABASE_URL environment variable must be set");

    println!("Connecting to database and applying migrations...");
    let pool = init_pool(&database_url).await?;
    println!("Migrations completed successfully!");

    let count: (i64,) = sqlx::query_as("SELECT count(*) FROM wards")
        .fetch_one(&pool)
        .await?;
    println!("Seeded wards count: {}", count.0);

    let tables: Vec<(String,)> = sqlx::query_as(
        "SELECT table_name FROM information_schema.tables WHERE table_schema = 'public' ORDER BY table_name"
    )
    .fetch_all(&pool)
    .await?;
    println!("Tables in public schema ({} total):", tables.len());
    for t in tables {
        println!(" - {}", t.0);
    }

    Ok(())
}
