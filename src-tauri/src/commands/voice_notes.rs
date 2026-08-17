//! Voice notes (Sprint 66) — an audio note recorded per todo list, mirroring
//! the camera check-ins (commands/checkins.rs). The frontend captures + encodes
//! the audio (webview `MediaRecorder`) and saves the bytes via `save_image`;
//! here we just record/list/delete the metadata row. Deleting also removes the
//! audio file from disk.

use crate::commands::AppState;
use crate::db::models::VoiceNote;
use crate::error::{AppError, AppResult};
use tauri::State;

#[tauri::command]
pub async fn add_voice_note(
    state: State<'_, AppState>,
    path: String,
    list_id: Option<i64>,
    duration_ms: i64,
) -> AppResult<VoiceNote> {
    if path.trim().is_empty() {
        return Err(AppError::BadInput("voice note path cannot be empty".into()));
    }
    sqlx::query_as::<_, VoiceNote>(
        "INSERT INTO voice_notes (list_id, path, duration_ms, created_at)
         VALUES (?1, ?2, ?3, datetime('now'))
         RETURNING id, list_id, path, duration_ms, created_at",
    )
    .bind(list_id)
    .bind(path.trim())
    .bind(duration_ms.max(0))
    .fetch_one(&state.pool)
    .await
    .map_err(Into::into)
}

#[tauri::command]
pub async fn list_voice_notes(state: State<'_, AppState>) -> AppResult<Vec<VoiceNote>> {
    sqlx::query_as::<_, VoiceNote>(
        "SELECT id, list_id, path, duration_ms, created_at FROM voice_notes
          ORDER BY created_at DESC, id DESC",
    )
    .fetch_all(&state.pool)
    .await
    .map_err(Into::into)
}

#[tauri::command]
pub async fn delete_voice_note(state: State<'_, AppState>, id: i64) -> AppResult<()> {
    // Fetch the path first so we can also remove the audio file from disk.
    let path: Option<String> = sqlx::query_scalar("SELECT path FROM voice_notes WHERE id = ?1")
        .bind(id)
        .fetch_optional(&state.pool)
        .await?;
    let Some(path) = path else {
        return Err(AppError::NotFound(format!("voice note {id}")));
    };
    sqlx::query("DELETE FROM voice_notes WHERE id = ?1")
        .bind(id)
        .execute(&state.pool)
        .await?;
    // Best-effort file removal — a missing file shouldn't fail the delete.
    let _ = std::fs::remove_file(&path);
    Ok(())
}

#[cfg(test)]
mod tests {
    use super::*;
    use crate::db::test_pool;

    #[tokio::test]
    async fn add_list_delete_roundtrip() {
        let pool = test_pool().await;
        for p in ["/tmp/a.m4a", "/tmp/b.m4a"] {
            sqlx::query("INSERT INTO voice_notes (list_id, path, duration_ms, created_at) VALUES (NULL, ?1, 1200, datetime('now'))")
                .bind(p)
                .execute(&pool)
                .await
                .unwrap();
        }
        let rows: Vec<VoiceNote> = sqlx::query_as(
            "SELECT id, list_id, path, duration_ms, created_at FROM voice_notes ORDER BY id",
        )
        .fetch_all(&pool)
        .await
        .unwrap();
        assert_eq!(rows.len(), 2);
        assert_eq!(rows[0].duration_ms, 1200);
        sqlx::query("DELETE FROM voice_notes WHERE id = ?1")
            .bind(rows[0].id)
            .execute(&pool)
            .await
            .unwrap();
        let count: i64 = sqlx::query_scalar("SELECT COUNT(*) FROM voice_notes")
            .fetch_one(&pool)
            .await
            .unwrap();
        assert_eq!(count, 1);
    }

    #[tokio::test]
    async fn voice_note_survives_list_deletion() {
        let pool = test_pool().await;
        let list = crate::commands::lists::create(&pool, "L", "2026-05-10")
            .await
            .unwrap();
        sqlx::query("INSERT INTO voice_notes (list_id, path, duration_ms, created_at) VALUES (?1, '/tmp/x.m4a', 500, datetime('now'))")
            .bind(list.id)
            .execute(&pool)
            .await
            .unwrap();
        sqlx::query("DELETE FROM lists WHERE id = ?1")
            .bind(list.id)
            .execute(&pool)
            .await
            .unwrap();
        let row: VoiceNote =
            sqlx::query_as("SELECT id, list_id, path, duration_ms, created_at FROM voice_notes")
                .fetch_one(&pool)
                .await
                .unwrap();
        assert_eq!(row.list_id, None);
    }
}
