// SPDX-License-Identifier: MIT
package io.dualix.buildgolem.link;

import com.google.gson.JsonArray;
import com.google.gson.JsonElement;
import com.google.gson.JsonObject;
import com.google.gson.JsonParser;

import java.net.URI;
import java.net.http.HttpClient;
import java.net.http.HttpRequest;
import java.net.http.HttpResponse;
import java.time.Duration;
import java.util.concurrent.CompletableFuture;

/** API de BuildGolem: vincular la cuenta, listar diseños y descargar el .nbt de uno. Todo asíncrono, fuera del hilo del juego. */
public final class Api {
    private static final HttpClient HTTP = HttpClient.newBuilder().connectTimeout(Duration.ofSeconds(10)).followRedirects(HttpClient.Redirect.NORMAL).build();
    private static final String UA = "BuildGolemLink/1.2.0 (Minecraft 1.21.1; NeoForge)";

    /** Error con el mensaje que da el servidor (en español) y su código HTTP. */
    public static final class ApiError extends RuntimeException {
        public final int status;
        ApiError(int status, String msg) { super(msg); this.status = status; }
    }

    private static String base() {
        String s = LinkConfig.SERVER.get().trim();
        if (!s.startsWith("https://") && !s.startsWith("http://localhost") && !s.startsWith("http://127.0.0.1"))
            throw new ApiError(0, "La dirección del servidor debe empezar por https://");
        return s.endsWith("/") ? s.substring(0, s.length() - 1) : s;
    }

    private static HttpRequest.Builder req(String path, boolean auth) {
        HttpRequest.Builder b = HttpRequest.newBuilder(URI.create(base() + "/api" + path)).timeout(Duration.ofSeconds(30))
            .header("User-Agent", UA).header("x-craftometry", "1").header("Accept", "application/json");
        if (auth && LinkConfig.linked()) b.header("Authorization", "Bearer " + LinkConfig.TOKEN.get());
        return b;
    }

    private static JsonElement json(HttpResponse<String> r) {
        JsonElement j = r.body() == null || r.body().isBlank() ? new JsonObject() : JsonParser.parseString(r.body());
        if (r.statusCode() >= 400) {
            String msg = j.isJsonObject() && j.getAsJsonObject().has("error") ? j.getAsJsonObject().get("error").getAsString() : "Error " + r.statusCode();
            throw new ApiError(r.statusCode(), msg);
        }
        return j;
    }

    private static CompletableFuture<JsonElement> get(String path) {
        return HTTP.sendAsync(req(path, true).GET().build(), HttpResponse.BodyHandlers.ofString()).thenApply(Api::json);
    }

    private static CompletableFuture<HttpResponse<String>> post(String path, JsonObject body) {
        return HTTP.sendAsync(req(path, false).header("Content-Type", "application/json").POST(HttpRequest.BodyPublishers.ofString(body.toString())).build(),
            HttpResponse.BodyHandlers.ofString());
    }

    /** Paso 1 del vínculo: pide un código para enseñar en el juego. */
    public static CompletableFuture<JsonObject> startLink() {
        JsonObject b = new JsonObject();
        b.addProperty("client", "BuildGolem Link 1.2.0");
        return post("/link/start", b).thenApply(r -> json(r).getAsJsonObject());
    }

    /** Paso 3: pregunta si ya se confirmó en la web. Devuelve null mientras está pendiente. */
    public static CompletableFuture<JsonObject> pollLink(String deviceCode) {
        JsonObject b = new JsonObject();
        b.addProperty("device_code", deviceCode);
        return post("/link/poll", b).thenApply(r -> {
            if (r.statusCode() == 202 || r.statusCode() == 429) return null;
            return json(r).getAsJsonObject();
        });
    }

    /** Diseños de la cuenta vinculada. */
    public static CompletableFuture<JsonArray> myDesigns() { return get("/designs").thenApply(JsonElement::getAsJsonArray); }

    /** Diseños públicos de la galería (sin cuenta). */
    public static CompletableFuture<JsonArray> gallery() { return get("/gallery").thenApply(JsonElement::getAsJsonArray); }

    /** La estructura .nbt (formato de estructura de Minecraft) de un diseño tuyo o público. */
    public static CompletableFuture<byte[]> nbt(String designId) {
        return HTTP.sendAsync(req("/designs/" + designId + "/export.nbt", true).GET().build(), HttpResponse.BodyHandlers.ofByteArray()).thenApply(r -> {
            if (r.statusCode() >= 400) throw new ApiError(r.statusCode(), r.statusCode() == 404 ? "El diseño no existe o es privado" : "Error " + r.statusCode());
            return r.body();
        });
    }

    /** Mensaje legible de cualquier fallo (red caída, servidor, token revocado…). */
    public static String message(Throwable t) {
        Throwable c = t instanceof java.util.concurrent.CompletionException && t.getCause() != null ? t.getCause() : t;
        if (c instanceof ApiError e) return e.status == 401 ? "La cuenta ya no está vinculada (token revocado). Vuelve a vincularla." : e.getMessage();
        if (c instanceof java.net.ConnectException || c instanceof java.net.http.HttpTimeoutException) return "No se puede conectar con " + LinkConfig.SERVER.get();
        return c.getClass().getSimpleName() + ": " + c.getMessage();
    }

    private Api() {}
}
