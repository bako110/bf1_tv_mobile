package tv.bf1.app;

import android.content.Intent;
import android.content.pm.ActivityInfo;
import android.net.Uri;
import android.os.Bundle;
import android.webkit.JavascriptInterface;
import android.webkit.WebSettings;
import android.webkit.WebView;
import androidx.browser.customtabs.CustomTabsIntent;
import com.getcapacitor.BridgeActivity;

public class MainActivity extends BridgeActivity {

    // Schéma de deep link pour le retour OAuth
    private static final String OAUTH_SCHEME = "bf1tv";
    private static final String OAUTH_CALLBACK_URI = "bf1tv://oauth/callback";

    @Override
    public void onCreate(Bundle savedInstanceState) {
        super.onCreate(savedInstanceState);

        WebView webView = getBridge().getWebView();
        WebSettings settings = webView.getSettings();
        settings.setMediaPlaybackRequiresUserGesture(false);
        settings.setDomStorageEnabled(true);
        settings.setMixedContentMode(WebSettings.MIXED_CONTENT_ALWAYS_ALLOW);
        settings.setJavaScriptEnabled(true);

        webView.addJavascriptInterface(new Object() {

            @JavascriptInterface
            public void exitApp() {
                runOnUiThread(() -> MainActivity.this.finish());
            }

            @JavascriptInterface
            public void setLandscape() {
                runOnUiThread(() ->
                    MainActivity.this.setRequestedOrientation(ActivityInfo.SCREEN_ORIENTATION_LANDSCAPE)
                );
            }

            @JavascriptInterface
            public void setPortrait() {
                runOnUiThread(() ->
                    MainActivity.this.setRequestedOrientation(ActivityInfo.SCREEN_ORIENTATION_PORTRAIT)
                );
            }

            @JavascriptInterface
            public void unlockOrientation() {
                runOnUiThread(() ->
                    MainActivity.this.setRequestedOrientation(ActivityInfo.SCREEN_ORIENTATION_UNSPECIFIED)
                );
            }

            /**
             * Ouvre Google OAuth via Chrome Custom Tab.
             * Le backend doit rediriger vers bf1tv://oauth/callback?token=xxx après succès.
             */
            @JavascriptInterface
            public void openOAuth(String url, String callbackHost) {
                runOnUiThread(() -> {
                    try {
                        CustomTabsIntent customTabsIntent = new CustomTabsIntent.Builder()
                            .setShowTitle(false)
                            .build();
                        customTabsIntent.intent.addFlags(Intent.FLAG_ACTIVITY_NO_HISTORY);
                        customTabsIntent.intent.addFlags(Intent.FLAG_ACTIVITY_NEW_TASK);
                        customTabsIntent.launchUrl(MainActivity.this, Uri.parse(url));
                    } catch (Exception e) {
                        // Fallback : ouvrir dans le navigateur par défaut
                        Intent intent = new Intent(Intent.ACTION_VIEW, Uri.parse(url));
                        intent.addFlags(Intent.FLAG_ACTIVITY_NEW_TASK);
                        startActivity(intent);
                    }
                });
            }

        }, "AndroidBridge");
    }

    @Override
    protected void onNewIntent(Intent intent) {
        super.onNewIntent(intent);
        // Intercepter le deep link bf1tv://oauth/callback?token=xxx
        Uri data = intent.getData();
        if (data != null && OAUTH_SCHEME.equals(data.getScheme())) {
            String token = data.getQueryParameter("token");
            String userJson = data.getQueryParameter("user");
            if (token != null) {
                final String finalToken = token;
                final String finalUser = userJson;
                String js = "window.dispatchEvent(new CustomEvent('bf1GoogleToken', { detail: {" +
                    "token: '" + finalToken.replace("'", "\\'") + "'," +
                    "user: " + (finalUser != null ? "'" + finalUser.replace("'", "\\'") + "'" : "null") +
                    "}}));";
                getBridge().getWebView().evaluateJavascript(js, null);
            } else {
                // Annulé ou erreur
                getBridge().getWebView().evaluateJavascript(
                    "window.dispatchEvent(new CustomEvent('bf1GoogleToken', { detail: { cancelled: true } }));",
                    null
                );
            }
        }
    }

    @Override
    public void onBackPressed() {
        getBridge().getWebView().evaluateJavascript(
            "window.dispatchEvent(new CustomEvent('bf1BackButton'))", null
        );
    }
}
