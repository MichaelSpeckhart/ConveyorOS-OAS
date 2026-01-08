
#[derive(Debug, serde::Serialize, serde::Deserialize)]
pub struct Result<T, E> {
    pub ok: Option<T>,
    pub err: Option<E>,
}