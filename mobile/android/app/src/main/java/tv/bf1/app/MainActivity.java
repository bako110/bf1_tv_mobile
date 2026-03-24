package tv.bf1.app;

import android.os.Bundle;
import android.webkit.JavascriptInterface;
import com.getcapacitor.BridgeActivity;

public class MainActivity extends BridgeActivity {

    @Override
    public void onCreate(Bundle savedInstanceState) {
        super.onCreate(savedInstanceState);
        // Exposer AndroidBridge.exitApp() au JavaScript
        getBridge().getWebView().addJavascriptInterface(new Object() {
            @JavascriptInterface
            public void exitApp() {
                runOnUiThread(() -> MainActivity.this.finish());
            }
        }, "AndroidBridge");
    }

    @Override
    public void onBackPressed() {
        // Dispatcher l'event au JavaScript plutôt que de laisser Android gérer
        getBridge().getWebView().evaluateJavascript(
            "window.dispatchEvent(new CustomEvent('bf1BackButton'))", null
        );
    }
}
