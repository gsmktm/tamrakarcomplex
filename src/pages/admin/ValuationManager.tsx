import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { DeviceCatalogTable } from "@/components/admin/valuation/DeviceCatalogTable";
import { ValuationRulesTable } from "@/components/admin/valuation/ValuationRulesTable";
import { SellRequestsTable } from "@/components/admin/valuation/SellRequestsTable";
import { SellPageEditor } from "@/components/admin/valuation/SellPageEditor";
import { ModelImportPanel } from "@/components/admin/valuation/ModelImportPanel";

const ValuationManager = () => {
  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <h1 className="text-3xl font-bold">Valuation Manager</h1>
      </div>

      <Tabs defaultValue="requests" className="w-full">
        <TabsList>
          <TabsTrigger value="requests">Sell Requests</TabsTrigger>
          <TabsTrigger value="import">Import Models</TabsTrigger>
          <TabsTrigger value="devices">Device Catalog</TabsTrigger>
          <TabsTrigger value="rules">Valuation Rules</TabsTrigger>
          <TabsTrigger value="editor">Page Editor</TabsTrigger>
        </TabsList>
        <TabsContent value="requests">
          <SellRequestsTable />
        </TabsContent>
        <TabsContent value="import">
          <ModelImportPanel />
        </TabsContent>
        <TabsContent value="devices">
          <DeviceCatalogTable />
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
