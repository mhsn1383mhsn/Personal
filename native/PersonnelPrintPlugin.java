package __PKG__;

import android.content.Context;
import android.os.Handler;
import android.os.Looper;
import android.print.PrintAttributes;
import android.print.PrintDocumentAdapter;
import android.print.PrintManager;
import android.webkit.WebView;
import android.webkit.WebViewClient;

import com.getcapacitor.Plugin;
import com.getcapacitor.PluginCall;
import com.getcapacitor.PluginMethod;
import com.getcapacitor.annotation.CapacitorPlugin;

@CapacitorPlugin(name = "PersonnelPrint")
public class PersonnelPrintPlugin extends Plugin {
    private WebView printView; // reference نگه داشته می‌شود تا GC حذفش نکند

    @PluginMethod
    public void print(final PluginCall call) {
        final String html = call.getString("html", "");
        final String jobName = call.getString("jobName", "Report");
        if (html == null || html.isEmpty()) { call.reject("empty html"); return; }

        getActivity().runOnUiThread(new Runnable() {
            @Override
            public void run() {
                try {
                    final WebView wv = new WebView(getActivity());
                    wv.getSettings().setAllowFileAccess(true);
                    wv.setWebViewClient(new WebViewClient() {
                        private boolean started = false;

                        @Override
                        public void onPageFinished(final WebView view, String url) {
                            if (started) return;
                            started = true;
                            // کمی صبر تا فونت‌ها بارگذاری شوند
                            new Handler(Looper.getMainLooper()).postDelayed(new Runnable() {
                                @Override
                                public void run() {
                                    try {
                                        PrintManager pm = (PrintManager) getActivity().getSystemService(Context.PRINT_SERVICE);
                                        PrintDocumentAdapter adapter = view.createPrintDocumentAdapter(jobName);
                                        pm.print(jobName, adapter, new PrintAttributes.Builder().build());
                                        call.resolve();
                                    } catch (Exception e) {
                                        call.reject(String.valueOf(e.getMessage()));
                                    }
                                }
                            }, 500);
                        }
                    });
                    printView = wv;
                    wv.loadDataWithBaseURL("file:///android_asset/public/", html, "text/html", "UTF-8", null);
                } catch (Exception e) {
                    call.reject(String.valueOf(e.getMessage()));
                }
            }
        });
    }
}
