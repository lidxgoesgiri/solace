import { ArrowLeft } from "lucide-react";
import { getTranslations } from "next-intl/server";
import { Button } from "@/components/ui/button";
import { Link } from "@/i18n/navigation";
import { PATHS } from "@/lib/flow";

interface ComingSoonProps {
  title: string;
  body: string;
  testId: string;
}

/**
 * Temporary page for a branch that ships in a later PR. The route already
 * exists so the crisis gate (K3, K4) covers it from day one.
 */
export async function ComingSoon({ title, body, testId }: ComingSoonProps) {
  const common = await getTranslations("common");
  return (
    <section data-testid={testId} className="space-y-4">
      <h1 className="text-3xl sm:text-4xl">{title}</h1>
      <p>{body}</p>
      <Button asChild variant="outline">
        <Link href={PATHS.hasil}>
          <ArrowLeft aria-hidden="true" />
          {common("backToResults")}
        </Link>
      </Button>
    </section>
  );
}
