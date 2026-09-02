import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { ValuationRulesTable } from "@/components/admin/valuation/ValuationRulesTable";
import { SellRequestsTable } from "@/components/admin/valuation/SellRequestsTable";
import { SellPageEditor } from "@/components/admin/valuation/SellPageEditor";
import { CatalogValuationPricing } from "@/components/admin/valuation/CatalogValuationPricing";
import { Badge } from "@/components/ui/badge";

const ValuationManager = () => {
  return (
    <div className="space-y-6">
      <div>
        <div className="flex flex-wrap items-center gap-3"><h1 className="text-3xl font-bold">Valuation Manager</h1><Badge variant="secondary">Live sell flow</Badge></div>
        <p className="mt-2 text-muted-foreground">Configure model prices, tune calculation rules and move customer requests from quote to inspection.</p>
      </div>

      <Tabs defaultValue="requests" className="w-full">
        <TabsList className="h-auto flex flex-wrap justify-start">
          <TabsTrigger value="requests">Sell Requests</TabsTrigger>
          <TabsTrigger value="pricing">Model Prices</TabsTrigger>
          <TabsTrigger value="rules">Advanced Rules</TabsTrigger>
          <TabsTrigger value="editor">Page Editor</TabsTrigger>
        </TabsList>
        <TabsContent value="requests">
          <SellRequestsTable />
        </TabsContent>
        <TabsContent value="pricing">
          <CatalogValuationPricing />
        </TabsContent>
        <TabsContent value="rules">
          <ValuationRulesTable />
        </TabsContent>
        <TabsContent value="editor">
          <SellPageEditor />
        </TabsContent>
      </Tabs>
    </div>
  );
};


export default ValuationManager;
