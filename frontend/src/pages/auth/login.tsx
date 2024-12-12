import React from "react";
import { useLogin } from "@refinedev/core";
import { Card, Form, Input, Button, Checkbox, Typography, Layout } from "antd";
import { Logo } from "@/components/logo";
import { UserOutlined, LockOutlined } from "@ant-design/icons";

const { Title } = Typography;

interface LoginFormValues {
  username: string;
  password: string;
  remember: boolean;
}

export const LoginPage: React.FC = () => {
  const [form] = Form.useForm<LoginFormValues>();
  const { mutate: login, isLoading } = useLogin();

  const onFinish = (values: LoginFormValues) => {
    login(values);
  };

  return (
    <Layout style={{ 
      background: "#f0f2f5", 
      minHeight: "100vh",
      display: "flex",
      justifyContent: "center",
      alignItems: "center"
    }}>
      <Card
        style={{
          width: "400px",
          padding: "24px",
          borderRadius: "8px",
          boxShadow: "0 2px 8px rgba(0, 0, 0, 0.15)"
        }}
      >
        <div style={{ textAlign: "center", marginBottom: "32px" }}>
          <Logo
            titleProps={{ level: 2 }}
            svgProps={{
              width: "48px",
              height: "40px",
            }}
          />
          <Title level={4} style={{ marginTop: "16px" }}>Welcome back!</Title>
        </div>

        <Form<LoginFormValues>
          form={form}
          layout="vertical"
          onFinish={onFinish}
          requiredMark={false}
          initialValues={{
            remember: true,
          }}
          style={{ maxWidth: "100%" }}
        >
          <Form.Item
            name="username"
            label="Email"
            rules={[
              {
                required: true,
                message: "Please enter your email",
              },
              {
                type: "email",
                message: "Please enter a valid email address",
              },
            ]}
          >
            <Input 
              size="large" 
              prefix={<UserOutlined />} 
              placeholder="Enter your email" 
            />
          </Form.Item>

          <Form.Item
            name="password"
            label="Password"
            rules={[
              {
                required: true,
                message: "Please enter your password",
              },
            ]}
          >
            <Input.Password 
              size="large" 
              prefix={<LockOutlined />} 
              placeholder="••••••••" 
            />
          </Form.Item>

          <Form.Item name="remember" valuePropName="checked">
            <Checkbox>Remember me</Checkbox>
          </Form.Item>

          <Form.Item style={{ marginBottom: 0 }}>
            <Button
              type="primary"
              size="large"
              htmlType="submit"
              loading={isLoading}
              block
            >
              Sign in
            </Button>
          </Form.Item>
        </Form>
      </Card>
    </Layout>
  );
}; 