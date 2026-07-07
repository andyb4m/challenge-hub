import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

export function LegalSection({
  title,
  children,
}: {
  title: string;
  children: React.ReactNode;
}) {
  return (
    <Card>
      <CardHeader>
        <CardTitle>{title}</CardTitle>
      </CardHeader>
      <CardContent className="flex flex-col gap-3 text-sm text-muted">
        {children}
      </CardContent>
    </Card>
  );
}
