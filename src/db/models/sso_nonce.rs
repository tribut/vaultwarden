use chrono::{NaiveDateTime, Utc};

use crate::api::EmptyResult;
use crate::db::{DbConn, DbPool};
use crate::error::MapResult;
use crate::sso::NONCE_EXPIRATION;

db_object! {
    #[derive(Identifiable, Queryable, Insertable)]
    #[diesel(table_name = sso_nonce)]
    #[diesel(primary_key(state))]
    pub struct SsoNonce {
        pub state: String,
        pub nonce: String,
        pub verifier: Option<String>,
        pub redirect_uri: String,
        pub created_at: NaiveDateTime,
    }
}

/// Local methods
impl SsoNonce {
    pub fn new(state: String, nonce: String, verifier: Option<String>, redirect_uri: String) -> Self {
        let now = Utc::now().naive_utc();

        SsoNonce {
            state,
            nonce,
            verifier,
            redirect_uri,
            created_at: now,
        }
    }
}

/// Database methods
impl SsoNonce {
    pub async fn save(&self, conn: &mut DbConn) -> EmptyResult {
        db_run! { conn:
            sqlite, mysql {
                diesel::replace_into(sso_nonce::table)
                    .values(SsoNonceDb::to_db(self))
                    .execute(conn)
                    .map_res("Error saving SSO device")
            }
            postgresql {
                let value = SsoNonceDb::to_db(self);
                diesel::insert_into(sso_nonce::table)
                    .values(&value)
                    .execute(conn)
                    .map_res("Error saving SSO nonce")
            }
        }
    }

    pub async fn delete(state: &str, conn: &mut DbConn) -> EmptyResult {
        db_run! { conn: {
            diesel::delete(sso_nonce::table.filter(sso_nonce::state.eq(state)))
                .execute(conn)
                .map_res("Error deleting SSO nonce")
        }}
    }

    pub async fn find(state: &str, conn: &DbConn) -> Option<Self> {
        let oldest = Utc::now().naive_utc() - *NONCE_EXPIRATION;
        db_run! { conn: {
            sso_nonce::table
                .filter(sso_nonce::state.eq(state))
                .filter(sso_nonce::created_at.ge(oldest))
                .first::<SsoNonceDb>(conn)
                .ok()
                .from_db()
        }}
    }

    pub async fn delete_expired(pool: DbPool) -> EmptyResult {
        debug!("Purging expired sso_nonce");
        if let Ok(conn) = pool.get().await {
            let oldest = Utc::now().naive_utc() - *NONCE_EXPIRATION;
            db_run! { conn: {
                diesel::delete(sso_nonce::table.filter(sso_nonce::created_at.lt(oldest)))
                    .execute(conn)
                    .map_res("Error deleting expired SSO nonce")
            }}
        } else {
            err!("Failed to get DB connection while purging expired sso_nonce")
        }
    }
}
