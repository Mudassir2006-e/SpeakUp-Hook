import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Privacy Policy | SpeakUp LMS",
  description:
    "Official SpeakUp LMS Privacy Policy detailing our data protection standards, institutional governance, and compliance with the Google API Services User Data Policy, including the Limited Use requirements.",
};

export default function PrivacyLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return <>{children}</>;
}

