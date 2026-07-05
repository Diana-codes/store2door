import { PageHeader } from "@/components/app/page-header";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { prisma } from "@/lib/prisma";
import { requireUser } from "@/lib/auth";

export default async function SettingsPage() {
  const user = await requireUser();
  const categories = await prisma.category.findMany({
    orderBy: [{ kind: "asc" }, { name: "asc" }],
  });

  const grouped = categories.reduce<Record<string, typeof categories>>(
    (acc, c) => {
      (acc[c.kind] ??= []).push(c);
      return acc;
    },
    {},
  );

  return (
    <div className="space-y-6">
      <PageHeader
        title="Settings"
        description="Account and catalog configuration."
      />

      <Card>
        <CardHeader>
          <CardTitle className="text-base">Account</CardTitle>
        </CardHeader>
        <CardContent className="grid gap-4 sm:grid-cols-2">
          <div className="grid gap-2">
            <Label>Name</Label>
            <Input defaultValue={user.name} disabled />
          </div>
          <div className="grid gap-2">
            <Label>Email</Label>
            <Input defaultValue={user.email} disabled />
          </div>
          <p className="col-span-full text-xs text-muted-foreground">
            Editing account details and changing password will be wired up in the
            next iteration.
          </p>
        </CardContent>
      </Card>

      {Object.entries(grouped).map(([kind, cats]) => (
        <Card key={kind}>
          <CardHeader>
            <CardTitle className="text-base capitalize">
              {kind.toLowerCase()} categories
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="flex flex-wrap gap-2">
              {cats.map((c) => (
                <Badge
                  key={c.id}
                  variant="outline"
                  className="gap-1.5"
                  style={{
                    borderColor: (c.color ?? "#94A3B8") + "40",
                    backgroundColor: (c.color ?? "#94A3B8") + "10",
                  }}
                >
                  <span
                    className="size-2 rounded-full"
                    style={{ backgroundColor: c.color ?? "#94A3B8" }}
                  />
                  {c.name}
                </Badge>
              ))}
            </div>
          </CardContent>
        </Card>
      ))}
    </div>
  );
}
