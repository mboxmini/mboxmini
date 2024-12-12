import React from "react";
import type { RefineThemedLayoutV2HeaderProps } from "@refinedev/antd";
import { useNavigation, Link } from "@refinedev/core";
import { Layout as AntdLayout, Button, theme, Flex } from "antd";
import { CloudServerOutlined } from "@ant-design/icons";
import { useLocation } from "react-router-dom";
import { useConfigProvider } from "@/providers/config-provider";
import { Search } from "@/components/header/search";
import { IconMoon, IconSun } from "@/components/icons";
import { User } from "@/components/header/user";
import { Logo } from "@/components/logo";
import { useStyles } from "./styled";
import styled from "styled-components";

const ServerSection = styled.div`
  display: flex;
  align-items: center;
  gap: 8px;
  transition: color 0.2s ease;
  
  &:hover {
    color: ${() => {
      const { useToken } = theme;
      const { token } = useToken();
      return token.colorPrimary;
    }};
  }
`;

export const Header: React.FC<RefineThemedLayoutV2HeaderProps> = () => {
  const { list } = useNavigation();
  const location = useLocation();
  const { token } = theme.useToken();
  const { mode, setMode } = useConfigProvider();
  const { styles } = useStyles();

  return (
    <AntdLayout.Header
      className="print-hidden"
      style={{
        backgroundColor: token.colorBgElevated,
        padding: "0 16px",
        minHeight: "48px",
        height: "max-content",
      }}
    >
      <Flex
        align="center"
        justify="space-between"
        wrap="wrap"
        style={{
          width: "100%",
          maxWidth: "1440px",
          margin: "0 auto",
          height: "100%",
        }}
      >
        <Flex align="center" wrap="wrap" gap={16}>
          <Link
            to="/"
            style={{
              display: "flex",
              alignItems: "center",
              color: "inherit",
              textDecoration: "none",
            }}
          >
            <Logo
              style={{
                width: "200px",
              }}
            />
          </Link>
          <Link
            to="/servers"
            style={{
              display: "flex",
              alignItems: "center",
              color: "inherit",
              textDecoration: "none",
            }}
          >
            <ServerSection>
              <CloudServerOutlined style={{ fontSize: "24px" }} />
              <span style={{ fontSize: "16px" }}>Servers</span>
            </ServerSection>
          </Link>
        </Flex>
        <Flex align="center" gap={32} className={styles.rightSlot}>
          <Search />
          <Button
            className={styles.themeSwitch}
            type="text"
            icon={mode === "light" ? <IconMoon /> : <IconSun />}
            onClick={() => {
              setMode(mode === "light" ? "dark" : "light");
            }}
          />
          <User />
        </Flex>
      </Flex>
    </AntdLayout.Header>
  );
};
