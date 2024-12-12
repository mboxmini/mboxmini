import { Authenticated, Refine } from "@refinedev/core";
import {
  useNotificationProvider,
  ThemedLayoutV2,
  ErrorComponent,
} from "@refinedev/antd";
import routerProvider, {
  NavigateToResource,
  UnsavedChangesNotifier,
  DocumentTitleHandler,
  CatchAllNavigate,
} from "@refinedev/react-router-v6";
import { BrowserRouter, Routes, Route, Outlet } from "react-router-dom";
import { DevtoolsPanel, DevtoolsProvider } from "@refinedev/devtools";
import { App as AntdApp } from "antd";
import { Header } from "@/components/header";
import { Logo } from "@/components/logo";
import { LoginPage } from "@/pages/auth/login";
import {
  ServerList,
  ServerCreate,
  ServerShow,
} from "@/pages/servers";
import { dataProvider } from "@/providers/data-provider";
import { authProvider } from "@/providers/auth-provider";
import { ConfigProvider } from "@/providers/config-provider";
import "@refinedev/antd/dist/reset.css";
import "./styles/custom.css";

const App: React.FC = () => {
  return (
    <DevtoolsProvider>
      <BrowserRouter>
        <ConfigProvider>
          <AntdApp>
            <Refine
              routerProvider={routerProvider}
              authProvider={authProvider}
              dataProvider={dataProvider}
              resources={[
                {
                  name: "servers",
                  list: "/servers",
                  create: "/servers/new",
                  show: "/servers/:id",
                },
              ]}
              notificationProvider={useNotificationProvider}
              options={{
                syncWithLocation: true,
                warnWhenUnsavedChanges: true,
                breadcrumb: false,
              }}
            >
              <Routes>
                <Route
                  path="/login"
                  element={
                    <Authenticated
                      key="login"
                      fallback={<LoginPage />}
                      v3LegacyAuthProviderCompatible
                    >
                      <NavigateToResource />
                    </Authenticated>
                  }
                />

                <Route
                  element={
                    <Authenticated
                      key="main"
                      fallback={<CatchAllNavigate to="/login" />}
                      v3LegacyAuthProviderCompatible
                    >
                      <ThemedLayoutV2
                        Header={() => <Header />}
                        Sider={() => null}
                      >
                        <div
                          style={{
                            maxWidth: "1280px",
                            padding: "24px",
                            margin: "0 auto",
                          }}
                        >
                          <Outlet />
                        </div>
                      </ThemedLayoutV2>
                    </Authenticated>
                  }
                >
                  <Route index element={<NavigateToResource />} />
                  <Route path="/servers">
                    <Route index element={<ServerList />} />
                    <Route path="new" element={<ServerCreate />} />
                    <Route path=":id" element={<ServerShow />} />
                  </Route>
                  <Route path="*" element={<ErrorComponent />} />
                </Route>
              </Routes>
              <UnsavedChangesNotifier />
              <DocumentTitleHandler />
            </Refine>
          </AntdApp>
        </ConfigProvider>
        <DevtoolsPanel />
      </BrowserRouter>
    </DevtoolsProvider>
  );
};

export default App;
