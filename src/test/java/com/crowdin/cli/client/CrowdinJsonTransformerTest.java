package com.crowdin.cli.client;

import com.crowdin.client.core.http.exceptions.CrowdinApiException;
import com.crowdin.client.core.http.exceptions.HttpException;
import com.crowdin.client.core.http.impl.json.JacksonJsonTransformer;
import com.crowdin.client.projectsgroups.model.ProjectResponseObject;
import org.junit.jupiter.api.Test;

import static org.junit.jupiter.api.Assertions.assertAll;
import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.junit.jupiter.api.Assertions.assertFalse;
import static org.junit.jupiter.api.Assertions.assertInstanceOf;
import static org.junit.jupiter.api.Assertions.assertNull;
import static org.junit.jupiter.api.Assertions.assertThrows;
import static org.junit.jupiter.api.Assertions.assertTrue;

public class CrowdinJsonTransformerTest {

    private static final String NGINX_403 =
        "<html>\n"
            + "<head><title>403 Forbidden</title></head>\n"
            + "<body>\n"
            + "<center><h1>403 Forbidden</h1></center>\n"
            + "<hr><center>nginx</center>\n"
            + "</body>\n"
            + "</html>\n";

    private final CrowdinJsonTransformer transformer = new CrowdinJsonTransformer(new JacksonJsonTransformer());

    @Test
    public void htmlErrorBecomesReadableHttpException() {
        CrowdinApiException result = transformer.parse(NGINX_403, CrowdinApiException.class);

        HttpException httpException = assertInstanceOf(HttpException.class, result);
        assertAll(
            () -> assertEquals("403", httpException.getError().getCode()),
            () -> assertEquals("403 Forbidden", httpException.getError().getMessage()),
            () -> assertEquals(NGINX_403, httpException.getHttpResponse())
        );
    }

    @Test
    public void htmlWithoutTitleFallsBackToBody() {
        String html = "<html><body><center><h1>502 Bad Gateway</h1></center></body></html>";

        HttpException httpException = (HttpException) transformer.parse(html, CrowdinApiException.class);

        assertAll(
            () -> assertEquals("502", httpException.getError().getCode()),
            () -> assertEquals("502 Bad Gateway", httpException.getError().getMessage())
        );
    }

    @Test
    public void htmlWithoutStatusCodeKeepsNullCode() {
        String html = "<html><head><title>Access denied</title></head><body>blocked</body></html>";

        HttpException httpException = (HttpException) transformer.parse(html, CrowdinApiException.class);

        assertAll(
            () -> assertNull(httpException.getError().getCode()),
            () -> assertEquals("Access denied", httpException.getError().getMessage())
        );
    }

    @Test
    public void validJsonErrorIsDelegated() {
        String json = "{\"error\":{\"code\":\"401\",\"message\":\"Unauthorized\"}}";

        HttpException httpException = (HttpException) transformer.parse(json, CrowdinApiException.class);

        assertAll(
            () -> assertEquals("401", httpException.getError().getCode()),
            () -> assertEquals("Unauthorized", httpException.getError().getMessage()),
            () -> assertNull(httpException.getHttpResponse())
        );
    }

    @Test
    public void malformedNonHtmlBodyIsRethrown() {
        assertThrows(Exception.class, () -> transformer.parse("not a json body", ProjectResponseObject.class));
    }

    @Test
    public void looksLikeHtmlDetection() {
        assertAll(
            () -> assertTrue(CrowdinJsonTransformer.looksLikeHtml("<!DOCTYPE html><html></html>")),
            () -> assertTrue(CrowdinJsonTransformer.looksLikeHtml("  <html><body>x</body></html>")),
            () -> assertFalse(CrowdinJsonTransformer.looksLikeHtml("{\"error\":{}}")),
            () -> assertFalse(CrowdinJsonTransformer.looksLikeHtml("")),
            () -> assertFalse(CrowdinJsonTransformer.looksLikeHtml(null)),
            () -> assertFalse(CrowdinJsonTransformer.looksLikeHtml("<xml>not html</xml>"))
        );
    }

    @Test
    public void delegatesConvert() {
        assertEquals(
            new JacksonJsonTransformer().convert("value"),
            transformer.convert("value"));
    }
}
