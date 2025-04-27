import React, { useState, useEffect, ChangeEvent } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { apiRequest } from "@/lib/queryClient";
import { Loader2, FileText, Database, Plus, Trash, CheckCircle2, Edit, Save } from "lucide-react";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useToast } from "@/hooks/use-toast";
import { Badge } from "@/components/ui/badge";
import { Textarea } from "@/components/ui/textarea";
import { FmecaManager } from "@/components/fmeca/FmecaManager";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";

interface System {
  id: number;
  name: string;
  purpose?: string;
}

interface Asset {
  id: number;
  tagNumber: string;
  description: string;
  function: string;
}

interface Component {
  id: number;
  name: string;
  description?: string;
}

interface AssetFmecaRow {
  id: string;
  tagNumber: string;     // Associated with the asset tag number
  assetDescription: string; // Associated with the asset description
  assetFunction: string;  // Associated with the asset function
  component: string;
  failureMode: string;
  cause: string;
  effect: string;
  severity: number;
  severityJustification: string; // Justification for severity rating
  probability: number;
  probabilityJustification: string; // Justification for probability rating
  detection: number;
  detectionJustification: string; // Justification for detection rating
  rpn: number;
  action: string;
  responsibility: string; // Person or role responsible for the action
  targetDate: string;
  completionDate?: string; // When the action was actually completed
  verifiedBy?: string; // Who verified the action was completed
  effectivenessVerified?: 'yes' | 'no' | 'partial' | ''; // Whether the action was effective
  comments: string;
}

interface SystemFmecaRow {
  id: string;
  systemId: string;      // Associated with the system ID
  systemName: string;    // Associated with the system name
  systemFunction: string; // Associated with the system function
  subsystem: string;
  failureMode: string;
  cause: string;
  effect: string;
  severity: number;
  severityJustification: string; // Justification for severity rating
  probability: number;
  probabilityJustification: string; // Justification for probability rating
  detection: number;
  detectionJustification: string; // Justification for detection rating
  rpn: number;
  action: string;
  responsibility: string; // Person or role responsible for the action
  targetDate: string;
  completionDate?: string; // When the action was actually completed
  verifiedBy?: string; // Who verified the action was completed
  effectivenessVerified?: 'yes' | 'no' | 'partial' | ''; // Whether the action was effective
  comments: string;
}

const FmecaPage: React.FC = () => {
  const [selectedTab, setSelectedTab] = useState("asset-level");
  const { toast } = useToast();
  const queryClient = useQueryClient();
  
  // Asset-level FMECA form state
  const [assetTagNumber, setAssetTagNumber] = useState("");
  const [assetDescription, setAssetDescription] = useState("");
  const [assetFunction, setAssetFunction] = useState("");
  const [assetRows, setAssetRows] = useState<AssetFmecaRow[]>([]);
  
  // New asset row ratings state
  const [assetSeverity, setAssetSeverity] = useState<number>(5);
  const [assetSeverityJustification, setAssetSeverityJustification] = useState<string>("");
  const [assetProbability, setAssetProbability] = useState<number>(5);
  const [assetProbabilityJustification, setAssetProbabilityJustification] = useState<string>("");
  const [assetDetection, setAssetDetection] = useState<number>(5);
  const [assetDetectionJustification, setAssetDetectionJustification] = useState<string>("");
  
  // Verification tracking state for asset FMECA
  const [assetEffectivenessValue, setAssetEffectivenessValue] = useState<string>("");
  
  // Edit dialog state for asset FMECA rows
  const [isEditingAsset, setIsEditingAsset] = useState(false);
  const [editingAssetRow, setEditingAssetRow] = useState<AssetFmecaRow | null>(null);
  
  // System-level FMECA form state
  const [systemName, setSystemName] = useState("");
  const [systemDescription, setSystemDescription] = useState("");
  const [systemFunction, setSystemFunction] = useState("");
  const [systemRows, setSystemRows] = useState<SystemFmecaRow[]>([]);
  
  // New system row ratings state
  const [systemSeverity, setSystemSeverity] = useState<number>(5);
  const [systemSeverityJustification, setSystemSeverityJustification] = useState<string>("");
  const [systemProbability, setSystemProbability] = useState<number>(5);
  const [systemProbabilityJustification, setSystemProbabilityJustification] = useState<string>("");
  const [systemDetection, setSystemDetection] = useState<number>(5);
  const [systemDetectionJustification, setSystemDetectionJustification] = useState<string>("");
  
  // Verification tracking state for system FMECA
  const [systemEffectivenessValue, setSystemEffectivenessValue] = useState<string>("");
  
  // Edit dialog state for system FMECA rows
  const [isEditingSystem, setIsEditingSystem] = useState(false);
  const [editingSystemRow, setEditingSystemRow] = useState<SystemFmecaRow | null>(null);
  
  // Helper functions for RPN calculation and display
  const calculateAssetRpn = (): number => {
    return assetSeverity * assetProbability * assetDetection;
  };
  
  const getColorByRpn = (rpn: number): string => {
    if (rpn >= 200) return "text-red-600";
    if (rpn >= 125) return "text-amber-600";
    return "text-green-600";
  };
  
  const getColorClassByRpn = (rpn: number): string => {
    if (rpn >= 200) return "bg-red-500 hover:bg-red-600";
    if (rpn >= 125) return "bg-amber-500 hover:bg-amber-600";
    return "bg-green-500 hover:bg-green-600";
  };
  
  const getRiskLevelByRpn = (rpn: number): string => {
    if (rpn >= 200) return "High Risk";
    if (rpn >= 125) return "Medium Risk";
    return "Low Risk";
  };
  
  // Handler functions for asset-level FMECA
  const handleAssetRatingChange = (type: string, value: number) => {
    switch (type) {
      case 'severity':
        setAssetSeverity(value);
        break;
      case 'probability':
        setAssetProbability(value);
        break;
      case 'detection':
        setAssetDetection(value);
        break;
    }
  };
  
  const handleAddAssetRow = () => {
    // Get values from the form
    const componentEl = document.getElementById('new-component') as HTMLInputElement;
    const failureModeEl = document.getElementById('new-failure-mode') as HTMLInputElement;
    const causeEl = document.getElementById('new-cause') as HTMLInputElement;
    const effectEl = document.getElementById('new-effect') as HTMLInputElement;
    const actionEl = document.getElementById('new-action') as HTMLInputElement;
    const responsibilityEl = document.getElementById('new-responsibility') as HTMLInputElement;
    const targetDateEl = document.getElementById('new-target-date') as HTMLInputElement;
    const commentsEl = document.getElementById('new-comments') as HTMLInputElement;
    
    // Validate required fields
    if (!assetTagNumber) {
      toast({
        title: "Asset Information Required",
        description: "Please enter the Asset Tag Number before adding components",
        variant: "destructive"
      });
      return;
    }
    
    if (!componentEl.value || !failureModeEl.value) {
      toast({
        title: "Input Required",
        description: "Component and Failure Mode are required fields",
        variant: "destructive"
      });
      return;
    }
    
    // Validate justification fields
    if (!assetSeverityJustification || !assetProbabilityJustification || !assetDetectionJustification) {
      toast({
        title: "Justification Required",
        description: "Please provide justification for all severity, probability, and detection ratings",
        variant: "destructive"
      });
      return;
    }

    // Get verification tracking fields
    const completionDateEl = document.getElementById('new-completion-date') as HTMLInputElement;
    const verifiedByEl = document.getElementById('new-verified-by') as HTMLInputElement;
    const effectivenessSelect = document.querySelector('select[name="effectiveness"]') as HTMLSelectElement;
    
    // Create new row with asset information
    const newRow: AssetFmecaRow = {
      id: Date.now().toString(),
      tagNumber: assetTagNumber,
      assetDescription: assetDescription,
      assetFunction: assetFunction,
      component: componentEl.value,
      failureMode: failureModeEl.value,
      cause: causeEl.value,
      effect: effectEl.value,
      severity: assetSeverity,
      severityJustification: assetSeverityJustification,
      probability: assetProbability,
      probabilityJustification: assetProbabilityJustification,
      detection: assetDetection,
      detectionJustification: assetDetectionJustification,
      rpn: calculateAssetRpn(),
      action: actionEl.value,
      responsibility: responsibilityEl.value,
      targetDate: targetDateEl.value,
      completionDate: completionDateEl?.value || '',
      verifiedBy: verifiedByEl?.value || '',
      effectivenessVerified: effectivenessSelect?.value as 'yes' | 'no' | 'partial' | '',
      comments: commentsEl.value
    };
    
    // Add new row to the table
    setAssetRows([...assetRows, newRow]);
    
    // Clear form fields
    componentEl.value = '';
    failureModeEl.value = '';
    causeEl.value = '';
    effectEl.value = '';
    actionEl.value = '';
    responsibilityEl.value = '';
    targetDateEl.value = '';
    commentsEl.value = '';
    
    // Reset ratings and justifications to default
    setAssetSeverity(5);
    setAssetProbability(5);
    setAssetDetection(5);
    setAssetSeverityJustification("");
    setAssetProbabilityJustification("");
    setAssetDetectionJustification("");
    
    toast({
      title: "Success",
      description: "FMECA row added successfully"
    });
  };
  
  const handleEditAssetRow = (row: AssetFmecaRow) => {
    // Create a deep copy of the row to avoid reference issues
    const rowCopy: AssetFmecaRow = JSON.parse(JSON.stringify(row));
    setEditingAssetRow(rowCopy);
    setIsEditingAsset(true);
  };
  
  const handleUpdateAssetRow = async () => {
    if (!editingAssetRow) return;
    
    try {
      // If the ID is a number (stored in database), update in the database
      if (!isNaN(Number(editingAssetRow.id))) {
        const apiRow = {
          ...editingAssetRow,
          // Convert string properties to required types
          severity: Number(editingAssetRow.severity),
          probability: Number(editingAssetRow.probability),
          detection: Number(editingAssetRow.detection),
          rpn: Number(editingAssetRow.rpn),
          // Ensure nullable fields are properly handled
          completionDate: editingAssetRow.completionDate || null,
          verifiedBy: editingAssetRow.verifiedBy || null,
          effectivenessVerified: editingAssetRow.effectivenessVerified || null,
        };
        
        const response = await apiRequest(
          "PUT", 
          `/api/enhanced-fmeca/asset/${editingAssetRow.id}`, 
          apiRow
        );
        
        if (!response.ok) {
          throw new Error("Failed to update FMECA row in database");
        }
      }
      
      // Update local state
      setAssetRows(assetRows.map(row => 
        row.id === editingAssetRow.id ? editingAssetRow : row
      ));
      
      // Close the edit modal
      setIsEditingAsset(false);
      setEditingAssetRow(null);
      
      toast({
        title: "Row Updated",
        description: "FMECA row updated successfully"
      });
      
      // Refresh data to ensure we have the latest state
      fetchAssetFmecaData();
      
    } catch (error) {
      console.error("Error updating FMECA row:", error);
      toast({
        title: "Update Failed",
        description: "Failed to update FMECA row",
        variant: "destructive"
      });
    }
  };
  
  const handleDeleteAssetRow = async (id: string) => {
    try {
      // If the ID is a number (stored in database), delete from the database
      if (!isNaN(Number(id))) {
        const response = await apiRequest(
          "DELETE", 
          `/api/enhanced-fmeca/asset/${id}`
        );
        
        if (!response.ok) {
          throw new Error("Failed to delete FMECA row from database");
        }
      }
      
      // Remove from local state
      setAssetRows(assetRows.filter(row => row.id !== id));
      
      toast({
        title: "Row Deleted",
        description: "FMECA row removed successfully"
      });
    } catch (error) {
      console.error("Error deleting FMECA row:", error);
      toast({
        title: "Delete Failed",
        description: "Failed to delete FMECA row",
        variant: "destructive"
      });
    }
  };
  
  const handleClearAssetFmeca = () => {
    if (window.confirm("Are you sure you want to clear all FMECA data?")) {
      setAssetTagNumber("");
      setAssetDescription("");
      setAssetFunction("");
      setAssetRows([]);
      setAssetSeverity(5);
      setAssetProbability(5);
      setAssetDetection(5);
      setAssetSeverityJustification("");
      setAssetProbabilityJustification("");
      setAssetDetectionJustification("");
      toast({
        title: "FMECA Cleared",
        description: "All FMECA data has been cleared"
      });
    }
  };
  
  const handleSaveAssetFmeca = async () => {
    // Save FMECA data to the database
    if (assetRows.length === 0) {
      toast({
        title: "Empty FMECA",
        description: "Please add at least one row before saving",
        variant: "destructive"
      });
      return;
    }
    
    try {
      // Save each row to the database
      for (const row of assetRows) {
        // Convert string IDs to proper format for API
        // Only send rows that don't have a numeric ID (not yet saved to DB)
        if (isNaN(Number(row.id))) {
          const apiRow = {
            ...row,
            // Convert string properties to required types
            severity: Number(row.severity),
            probability: Number(row.probability),
            detection: Number(row.detection),
            rpn: Number(row.rpn),
            // Set default values for nullable fields
            completionDate: row.completionDate || null,
            verifiedBy: row.verifiedBy || null,
            effectivenessVerified: row.effectivenessVerified || null,
          };
          
          const response = await apiRequest(
            "POST", 
            "/api/enhanced-fmeca/asset", 
            apiRow
          );
          
          if (!response.ok) {
            throw new Error("Failed to save FMECA row");
          }
        }
      }
      
      // After successful save, reload data
      fetchAssetFmecaData();
      
      toast({
        title: "FMECA Saved",
        description: "Your FMECA analysis has been saved successfully"
      });
    } catch (error) {
      console.error("Error saving FMECA data:", error);
      toast({
        title: "Save Failed",
        description: "There was an error saving your FMECA data",
        variant: "destructive"
      });
    }
  };
  
  // Helper function for system-level RPN calculation
  const calculateSystemRpn = (): number => {
    return systemSeverity * systemProbability * systemDetection;
  };
  
  // Handler functions for system-level FMECA
  const handleSystemRatingChange = (type: string, value: number) => {
    switch (type) {
      case 'severity':
        setSystemSeverity(value);
        break;
      case 'probability':
        setSystemProbability(value);
        break;
      case 'detection':
        setSystemDetection(value);
        break;
    }
  };
  
  const handleAddSystemRow = () => {
    // Get values from the form
    const subsystemEl = document.getElementById('new-subsystem') as HTMLInputElement;
    const failureModeEl = document.getElementById('new-system-failure-mode') as HTMLInputElement;
    const causeEl = document.getElementById('new-system-cause') as HTMLInputElement;
    const effectEl = document.getElementById('new-system-effect') as HTMLInputElement;
    const actionEl = document.getElementById('new-system-action') as HTMLInputElement;
    const responsibilityEl = document.getElementById('new-system-responsibility') as HTMLInputElement;
    const targetDateEl = document.getElementById('new-system-target-date') as HTMLInputElement;
    const commentsEl = document.getElementById('new-system-comments') as HTMLInputElement;
    
    // Validate system information is provided
    if (!systemName) {
      toast({
        title: "System Information Required",
        description: "Please enter the System Name before adding subsystems",
        variant: "destructive"
      });
      return;
    }
    
    if (!subsystemEl.value || !failureModeEl.value) {
      toast({
        title: "Input Required",
        description: "Subsystem and Failure Mode are required fields",
        variant: "destructive"
      });
      return;
    }
    
    // Validate justification fields
    if (!systemSeverityJustification || !systemProbabilityJustification || !systemDetectionJustification) {
      toast({
        title: "Justification Required",
        description: "Please provide justification for all severity, probability, and detection ratings",
        variant: "destructive"
      });
      return;
    }

    // Get verification tracking fields
    const completionDateEl = document.getElementById('new-system-completion-date') as HTMLInputElement;
    const verifiedByEl = document.getElementById('new-system-verified-by') as HTMLInputElement;
    const effectivenessSelect = document.querySelector('select[name="system-effectiveness"]') as HTMLSelectElement;
    
    // Create new row with system information
    const newRow: SystemFmecaRow = {
      id: Date.now().toString(),
      systemId: Date.now().toString(), // Temporary ID for now
      systemName: systemName,
      systemFunction: systemFunction,
      subsystem: subsystemEl.value,
      failureMode: failureModeEl.value,
      cause: causeEl.value,
      effect: effectEl.value,
      severity: systemSeverity,
      severityJustification: systemSeverityJustification,
      probability: systemProbability,
      probabilityJustification: systemProbabilityJustification,
      detection: systemDetection,
      detectionJustification: systemDetectionJustification,
      rpn: calculateSystemRpn(),
      action: actionEl.value,
      responsibility: responsibilityEl.value,
      targetDate: targetDateEl.value,
      completionDate: completionDateEl?.value || '',
      verifiedBy: verifiedByEl?.value || '',
      effectivenessVerified: effectivenessSelect?.value as 'yes' | 'no' | 'partial' | '',
      comments: commentsEl.value
    };
    
    // Add new row to the table
    setSystemRows([...systemRows, newRow]);
    
    // Clear form fields
    subsystemEl.value = '';
    failureModeEl.value = '';
    causeEl.value = '';
    effectEl.value = '';
    actionEl.value = '';
    responsibilityEl.value = '';
    targetDateEl.value = '';
    commentsEl.value = '';
    
    // Reset ratings and justifications to default
    setSystemSeverity(5);
    setSystemProbability(5);
    setSystemDetection(5);
    setSystemSeverityJustification("");
    setSystemProbabilityJustification("");
    setSystemDetectionJustification("");
    
    toast({
      title: "Success",
      description: "System FMECA row added successfully"
    });
  };
  
  const handleEditSystemRow = (row: SystemFmecaRow) => {
    // Create a deep copy of the row to avoid reference issues
    const rowCopy: SystemFmecaRow = JSON.parse(JSON.stringify(row));
    setEditingSystemRow(rowCopy);
    setIsEditingSystem(true);
  };
  
  const handleUpdateSystemRow = async () => {
    if (!editingSystemRow) return;
    
    try {
      // If the ID is a number (stored in database), update in the database
      if (!isNaN(Number(editingSystemRow.id))) {
        const apiRow = {
          ...editingSystemRow,
          // Convert string properties to required types
          severity: Number(editingSystemRow.severity),
          probability: Number(editingSystemRow.probability),
          detection: Number(editingSystemRow.detection),
          rpn: Number(editingSystemRow.rpn),
          // Ensure nullable fields are properly handled
          completionDate: editingSystemRow.completionDate || null,
          verifiedBy: editingSystemRow.verifiedBy || null,
          effectivenessVerified: editingSystemRow.effectivenessVerified || null,
        };
        
        const response = await apiRequest(
          "PUT", 
          `/api/enhanced-fmeca/system/${editingSystemRow.id}`, 
          apiRow
        );
        
        if (!response.ok) {
          throw new Error("Failed to update System FMECA row in database");
        }
      }
      
      // Update local state
      setSystemRows(systemRows.map(row => 
        row.id === editingSystemRow.id ? editingSystemRow : row
      ));
      
      // Close the edit modal
      setIsEditingSystem(false);
      setEditingSystemRow(null);
      
      toast({
        title: "Row Updated",
        description: "System FMECA row updated successfully"
      });
      
      // Refresh data to ensure we have the latest state
      fetchSystemFmecaData();
      
    } catch (error) {
      console.error("Error updating System FMECA row:", error);
      toast({
        title: "Update Failed",
        description: "Failed to update System FMECA row",
        variant: "destructive"
      });
    }
  };
  
  const handleDeleteSystemRow = async (id: string) => {
    try {
      // If the ID is a number (stored in database), delete from the database
      if (!isNaN(Number(id))) {
        const response = await apiRequest(
          "DELETE", 
          `/api/enhanced-fmeca/system/${id}`
        );
        
        if (!response.ok) {
          throw new Error("Failed to delete System FMECA row from database");
        }
      }
      
      // Remove from local state
      setSystemRows(systemRows.filter(row => row.id !== id));
      
      toast({
        title: "Row Deleted",
        description: "System FMECA row removed successfully"
      });
    } catch (error) {
      console.error("Error deleting System FMECA row:", error);
      toast({
        title: "Delete Failed",
        description: "Failed to delete System FMECA row",
        variant: "destructive"
      });
    }
  };
  
  const handleClearSystemFmeca = () => {
    if (window.confirm("Are you sure you want to clear all System FMECA data?")) {
      setSystemName("");
      setSystemDescription("");
      setSystemFunction("");
      setSystemRows([]);
      setSystemSeverity(5);
      setSystemProbability(5);
      setSystemDetection(5);
      setSystemSeverityJustification("");
      setSystemProbabilityJustification("");
      setSystemDetectionJustification("");
      toast({
        title: "System FMECA Cleared",
        description: "All System FMECA data has been cleared"
      });
    }
  };
  
  const handleSaveSystemFmeca = async () => {
    // Save System FMECA data to the database
    if (systemRows.length === 0) {
      toast({
        title: "Empty System FMECA",
        description: "Please add at least one row before saving",
        variant: "destructive"
      });
      return;
    }
    
    try {
      // Save each row to the database
      for (const row of systemRows) {
        // Convert string IDs to proper format for API
        // Only send rows that don't have a numeric ID (not yet saved to DB)
        if (isNaN(Number(row.id))) {
          const apiRow = {
            ...row,
            // Convert string properties to required types
            severity: Number(row.severity),
            probability: Number(row.probability),
            detection: Number(row.detection),
            rpn: Number(row.rpn),
            // Set default values for nullable fields
            completionDate: row.completionDate || null,
            verifiedBy: row.verifiedBy || null,
            effectivenessVerified: row.effectivenessVerified || null,
          };
          
          const response = await apiRequest(
            "POST", 
            "/api/enhanced-fmeca/system", 
            apiRow
          );
          
          if (!response.ok) {
            throw new Error("Failed to save System FMECA row");
          }
        }
      }
      
      // After successful save, reload data
      fetchSystemFmecaData();
      
      toast({
        title: "System FMECA Saved",
        description: "Your System FMECA analysis has been saved successfully"
      });
    } catch (error) {
      console.error("Error saving System FMECA data:", error);
      toast({
        title: "Save Failed",
        description: "There was an error saving your System FMECA data",
        variant: "destructive"
      });
    }
  };

  // Data fetching functions
  const fetchAssetFmecaData = async () => {
    try {
      const response = await apiRequest("GET", "/api/enhanced-fmeca/asset");
      if (!response.ok) {
        throw new Error("Failed to fetch asset FMECA data");
      }
      const data = await response.json();
      // Update state with fetched data
      setAssetRows(data.map((row: any) => ({
        ...row,
        id: row.id.toString()
      })));
      
      // Invalidate the query cache
      queryClient.invalidateQueries({queryKey: ["/api/enhanced-fmeca/asset"]});
      
    } catch (error) {
      console.error("Error fetching asset FMECA data:", error);
      toast({
        title: "Data Fetch Failed",
        description: "Failed to fetch asset FMECA data from the server",
        variant: "destructive"
      });
    }
  };
  
  const fetchSystemFmecaData = async () => {
    try {
      const response = await apiRequest("GET", "/api/enhanced-fmeca/system");
      if (!response.ok) {
        throw new Error("Failed to fetch system FMECA data");
      }
      const data = await response.json();
      // Update state with fetched data
      setSystemRows(data.map((row: any) => ({
        ...row,
        id: row.id.toString()
      })));
      
      // Invalidate the query cache
      queryClient.invalidateQueries({queryKey: ["/api/enhanced-fmeca/system"]});
      
    } catch (error) {
      console.error("Error fetching system FMECA data:", error);
      toast({
        title: "Data Fetch Failed",
        description: "Failed to fetch system FMECA data from the server",
        variant: "destructive"
      });
    }
  };
  
  // Load data on component mount
  useEffect(() => {
    fetchAssetFmecaData();
    fetchSystemFmecaData();
  }, []);
  
  // Handle tab changes
  useEffect(() => {
    if (selectedTab === "asset-level") {
      fetchAssetFmecaData();
    } else if (selectedTab === "system-level") {
      fetchSystemFmecaData();
    }
  }, [selectedTab]);
  
  // Get all systems
  const { data: systems, isLoading } = useQuery({
    queryKey: ["/api/fmeca/systems"],
    queryFn: async () => {
      const response = await apiRequest("GET", "/api/fmeca/systems");
      if (!response.ok) {
        throw new Error("Failed to fetch systems");
      }
      return response.json();
    },
  });

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-64">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
        <span className="ml-2">Loading systems...</span>
      </div>
    );
  }

  // Edit dialogs
  const renderAssetEditDialog = () => {
    if (!editingAssetRow) return null;
    
    return (
      <Dialog open={isEditingAsset} onOpenChange={setIsEditingAsset}>
        <DialogContent className="sm:max-w-[800px]">
          <DialogHeader>
            <DialogTitle>Edit FMECA Row</DialogTitle>
            <DialogDescription>
              Make changes to the FMECA row. Click save when you're done.
            </DialogDescription>
          </DialogHeader>
          
          <div className="grid gap-4 py-4">
            <div className="grid grid-cols-4 gap-4">
              <div className="col-span-4">
                <Label htmlFor="edit-component">Component</Label>
                <Input
                  id="edit-component"
                  value={editingAssetRow.component}
                  onChange={(e) => setEditingAssetRow({...editingAssetRow, component: e.target.value})}
                />
              </div>
              
              <div className="col-span-4">
                <Label htmlFor="edit-failure-mode">Failure Mode</Label>
                <Input
                  id="edit-failure-mode"
                  value={editingAssetRow.failureMode}
                  onChange={(e) => setEditingAssetRow({...editingAssetRow, failureMode: e.target.value})}
                />
              </div>
              
              <div className="col-span-4">
                <Label htmlFor="edit-cause">Cause</Label>
                <Textarea
                  id="edit-cause"
                  value={editingAssetRow.cause}
                  onChange={(e) => setEditingAssetRow({...editingAssetRow, cause: e.target.value})}
                />
              </div>
              
              <div className="col-span-4">
                <Label htmlFor="edit-effect">Effect</Label>
                <Textarea
                  id="edit-effect"
                  value={editingAssetRow.effect}
                  onChange={(e) => setEditingAssetRow({...editingAssetRow, effect: e.target.value})}
                />
              </div>
              
              <div className="col-span-1">
                <Label htmlFor="edit-severity">Severity (1-10)</Label>
                <Select 
                  value={editingAssetRow.severity.toString()} 
                  onValueChange={(value) => {
                    setEditingAssetRow({
                      ...editingAssetRow, 
                      severity: Number(value),
                      rpn: Number(value) * editingAssetRow.probability * editingAssetRow.detection
                    });
                  }}
                >
                  <SelectTrigger id="edit-severity">
                    <SelectValue placeholder="Severity" />
                  </SelectTrigger>
                  <SelectContent>
                    {[1, 2, 3, 4, 5, 6, 7, 8, 9, 10].map((num) => (
                      <SelectItem key={num} value={num.toString()}>
                        {num}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              
              <div className="col-span-3">
                <Label htmlFor="edit-severity-justification">Severity Justification</Label>
                <Input
                  id="edit-severity-justification"
                  value={editingAssetRow.severityJustification}
                  onChange={(e) => setEditingAssetRow({...editingAssetRow, severityJustification: e.target.value})}
                />
              </div>
              
              <div className="col-span-1">
                <Label htmlFor="edit-probability">Probability (1-10)</Label>
                <Select 
                  value={editingAssetRow.probability.toString()} 
                  onValueChange={(value) => {
                    setEditingAssetRow({
                      ...editingAssetRow, 
                      probability: Number(value),
                      rpn: editingAssetRow.severity * Number(value) * editingAssetRow.detection
                    });
                  }}
                >
                  <SelectTrigger id="edit-probability">
                    <SelectValue placeholder="Probability" />
                  </SelectTrigger>
                  <SelectContent>
                    {[1, 2, 3, 4, 5, 6, 7, 8, 9, 10].map((num) => (
                      <SelectItem key={num} value={num.toString()}>
                        {num}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              
              <div className="col-span-3">
                <Label htmlFor="edit-probability-justification">Probability Justification</Label>
                <Input
                  id="edit-probability-justification"
                  value={editingAssetRow.probabilityJustification}
                  onChange={(e) => setEditingAssetRow({...editingAssetRow, probabilityJustification: e.target.value})}
                />
              </div>
              
              <div className="col-span-1">
                <Label htmlFor="edit-detection">Detection (1-10)</Label>
                <Select 
                  value={editingAssetRow.detection.toString()} 
                  onValueChange={(value) => {
                    setEditingAssetRow({
                      ...editingAssetRow, 
                      detection: Number(value),
                      rpn: editingAssetRow.severity * editingAssetRow.probability * Number(value)
                    });
                  }}
                >
                  <SelectTrigger id="edit-detection">
                    <SelectValue placeholder="Detection" />
                  </SelectTrigger>
                  <SelectContent>
                    {[1, 2, 3, 4, 5, 6, 7, 8, 9, 10].map((num) => (
                      <SelectItem key={num} value={num.toString()}>
                        {num}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              
              <div className="col-span-3">
                <Label htmlFor="edit-detection-justification">Detection Justification</Label>
                <Input
                  id="edit-detection-justification"
                  value={editingAssetRow.detectionJustification}
                  onChange={(e) => setEditingAssetRow({...editingAssetRow, detectionJustification: e.target.value})}
                />
              </div>
              
              <div className="col-span-4">
                <Label htmlFor="edit-action">Action Required</Label>
                <Textarea
                  id="edit-action"
                  value={editingAssetRow.action}
                  onChange={(e) => setEditingAssetRow({...editingAssetRow, action: e.target.value})}
                />
              </div>
              
              <div className="col-span-2">
                <Label htmlFor="edit-responsibility">Responsibility</Label>
                <Input
                  id="edit-responsibility"
                  value={editingAssetRow.responsibility}
                  onChange={(e) => setEditingAssetRow({...editingAssetRow, responsibility: e.target.value})}
                />
              </div>
              
              <div className="col-span-2">
                <Label htmlFor="edit-target-date">Target Date</Label>
                <Input
                  id="edit-target-date"
                  type="date"
                  value={editingAssetRow.targetDate}
                  onChange={(e) => setEditingAssetRow({...editingAssetRow, targetDate: e.target.value})}
                />
              </div>
              
              <div className="col-span-2">
                <Label htmlFor="edit-completion-date">Completion Date</Label>
                <Input
                  id="edit-completion-date"
                  type="date"
                  value={editingAssetRow.completionDate || ''}
                  onChange={(e) => setEditingAssetRow({...editingAssetRow, completionDate: e.target.value})}
                />
              </div>
              
              <div className="col-span-2">
                <Label htmlFor="edit-verified-by">Verified By</Label>
                <Input
                  id="edit-verified-by"
                  value={editingAssetRow.verifiedBy || ''}
                  onChange={(e) => setEditingAssetRow({...editingAssetRow, verifiedBy: e.target.value})}
                />
              </div>
              
              <div className="col-span-2">
                <Label htmlFor="edit-effectiveness">Effectiveness Verified</Label>
                <Select 
                  value={editingAssetRow.effectivenessVerified || ''} 
                  onValueChange={(value) => {
                    setEditingAssetRow({...editingAssetRow, effectivenessVerified: value as 'yes' | 'no' | 'partial' | ''});
                  }}
                >
                  <SelectTrigger id="edit-effectiveness">
                    <SelectValue placeholder="Select" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="">Not verified</SelectItem>
                    <SelectItem value="yes">Yes</SelectItem>
                    <SelectItem value="no">No</SelectItem>
                    <SelectItem value="partial">Partial</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              
              <div className="col-span-2">
                <Label htmlFor="edit-comments">Comments</Label>
                <Textarea
                  id="edit-comments"
                  value={editingAssetRow.comments}
                  onChange={(e) => setEditingAssetRow({...editingAssetRow, comments: e.target.value})}
                />
              </div>
            </div>
          </div>
          
          <DialogFooter>
            <Button variant="outline" onClick={() => setIsEditingAsset(false)}>
              Cancel
            </Button>
            <Button onClick={handleUpdateAssetRow}>
              Save Changes
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    );
  };
  
  const renderSystemEditDialog = () => {
    if (!editingSystemRow) return null;
    
    return (
      <Dialog open={isEditingSystem} onOpenChange={setIsEditingSystem}>
        <DialogContent className="sm:max-w-[800px]">
          <DialogHeader>
            <DialogTitle>Edit System FMECA Row</DialogTitle>
            <DialogDescription>
              Make changes to the System FMECA row. Click save when you're done.
            </DialogDescription>
          </DialogHeader>
          
          <div className="grid gap-4 py-4">
            <div className="grid grid-cols-4 gap-4">
              <div className="col-span-4">
                <Label htmlFor="edit-subsystem">Subsystem</Label>
                <Input
                  id="edit-subsystem"
                  value={editingSystemRow.subsystem}
                  onChange={(e) => setEditingSystemRow({...editingSystemRow, subsystem: e.target.value})}
                />
              </div>
              
              <div className="col-span-4">
                <Label htmlFor="edit-system-failure-mode">Failure Mode</Label>
                <Input
                  id="edit-system-failure-mode"
                  value={editingSystemRow.failureMode}
                  onChange={(e) => setEditingSystemRow({...editingSystemRow, failureMode: e.target.value})}
                />
              </div>
              
              <div className="col-span-4">
                <Label htmlFor="edit-system-cause">Cause</Label>
                <Textarea
                  id="edit-system-cause"
                  value={editingSystemRow.cause}
                  onChange={(e) => setEditingSystemRow({...editingSystemRow, cause: e.target.value})}
                />
              </div>
              
              <div className="col-span-4">
                <Label htmlFor="edit-system-effect">Effect</Label>
                <Textarea
                  id="edit-system-effect"
                  value={editingSystemRow.effect}
                  onChange={(e) => setEditingSystemRow({...editingSystemRow, effect: e.target.value})}
                />
              </div>
              
              <div className="col-span-1">
                <Label htmlFor="edit-system-severity">Severity (1-10)</Label>
                <Select 
                  value={editingSystemRow.severity.toString()} 
                  onValueChange={(value) => {
                    setEditingSystemRow({
                      ...editingSystemRow, 
                      severity: Number(value),
                      rpn: Number(value) * editingSystemRow.probability * editingSystemRow.detection
                    });
                  }}
                >
                  <SelectTrigger id="edit-system-severity">
                    <SelectValue placeholder="Severity" />
                  </SelectTrigger>
                  <SelectContent>
                    {[1, 2, 3, 4, 5, 6, 7, 8, 9, 10].map((num) => (
                      <SelectItem key={num} value={num.toString()}>
                        {num}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              
              <div className="col-span-3">
                <Label htmlFor="edit-system-severity-justification">Severity Justification</Label>
                <Input
                  id="edit-system-severity-justification"
                  value={editingSystemRow.severityJustification}
                  onChange={(e) => setEditingSystemRow({...editingSystemRow, severityJustification: e.target.value})}
                />
              </div>
              
              <div className="col-span-1">
                <Label htmlFor="edit-system-probability">Probability (1-10)</Label>
                <Select 
                  value={editingSystemRow.probability.toString()} 
                  onValueChange={(value) => {
                    setEditingSystemRow({
                      ...editingSystemRow, 
                      probability: Number(value),
                      rpn: editingSystemRow.severity * Number(value) * editingSystemRow.detection
                    });
                  }}
                >
                  <SelectTrigger id="edit-system-probability">
                    <SelectValue placeholder="Probability" />
                  </SelectTrigger>
                  <SelectContent>
                    {[1, 2, 3, 4, 5, 6, 7, 8, 9, 10].map((num) => (
                      <SelectItem key={num} value={num.toString()}>
                        {num}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              
              <div className="col-span-3">
                <Label htmlFor="edit-system-probability-justification">Probability Justification</Label>
                <Input
                  id="edit-system-probability-justification"
                  value={editingSystemRow.probabilityJustification}
                  onChange={(e) => setEditingSystemRow({...editingSystemRow, probabilityJustification: e.target.value})}
                />
              </div>
              
              <div className="col-span-1">
                <Label htmlFor="edit-system-detection">Detection (1-10)</Label>
                <Select 
                  value={editingSystemRow.detection.toString()} 
                  onValueChange={(value) => {
                    setEditingSystemRow({
                      ...editingSystemRow, 
                      detection: Number(value),
                      rpn: editingSystemRow.severity * editingSystemRow.probability * Number(value)
                    });
                  }}
                >
                  <SelectTrigger id="edit-system-detection">
                    <SelectValue placeholder="Detection" />
                  </SelectTrigger>
                  <SelectContent>
                    {[1, 2, 3, 4, 5, 6, 7, 8, 9, 10].map((num) => (
                      <SelectItem key={num} value={num.toString()}>
                        {num}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              
              <div className="col-span-3">
                <Label htmlFor="edit-system-detection-justification">Detection Justification</Label>
                <Input
                  id="edit-system-detection-justification"
                  value={editingSystemRow.detectionJustification}
                  onChange={(e) => setEditingSystemRow({...editingSystemRow, detectionJustification: e.target.value})}
                />
              </div>
              
              <div className="col-span-4">
                <Label htmlFor="edit-system-action">Action Required</Label>
                <Textarea
                  id="edit-system-action"
                  value={editingSystemRow.action}
                  onChange={(e) => setEditingSystemRow({...editingSystemRow, action: e.target.value})}
                />
              </div>
              
              <div className="col-span-2">
                <Label htmlFor="edit-system-responsibility">Responsibility</Label>
                <Input
                  id="edit-system-responsibility"
                  value={editingSystemRow.responsibility}
                  onChange={(e) => setEditingSystemRow({...editingSystemRow, responsibility: e.target.value})}
                />
              </div>
              
              <div className="col-span-2">
                <Label htmlFor="edit-system-target-date">Target Date</Label>
                <Input
                  id="edit-system-target-date"
                  type="date"
                  value={editingSystemRow.targetDate}
                  onChange={(e) => setEditingSystemRow({...editingSystemRow, targetDate: e.target.value})}
                />
              </div>
              
              <div className="col-span-2">
                <Label htmlFor="edit-system-completion-date">Completion Date</Label>
                <Input
                  id="edit-system-completion-date"
                  type="date"
                  value={editingSystemRow.completionDate || ''}
                  onChange={(e) => setEditingSystemRow({...editingSystemRow, completionDate: e.target.value})}
                />
              </div>
              
              <div className="col-span-2">
                <Label htmlFor="edit-system-verified-by">Verified By</Label>
                <Input
                  id="edit-system-verified-by"
                  value={editingSystemRow.verifiedBy || ''}
                  onChange={(e) => setEditingSystemRow({...editingSystemRow, verifiedBy: e.target.value})}
                />
              </div>
              
              <div className="col-span-2">
                <Label htmlFor="edit-system-effectiveness">Effectiveness Verified</Label>
                <Select 
                  value={editingSystemRow.effectivenessVerified || ''} 
                  onValueChange={(value) => {
                    setEditingSystemRow({...editingSystemRow, effectivenessVerified: value as 'yes' | 'no' | 'partial' | ''});
                  }}
                >
                  <SelectTrigger id="edit-system-effectiveness">
                    <SelectValue placeholder="Select" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="">Not verified</SelectItem>
                    <SelectItem value="yes">Yes</SelectItem>
                    <SelectItem value="no">No</SelectItem>
                    <SelectItem value="partial">Partial</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              
              <div className="col-span-2">
                <Label htmlFor="edit-system-comments">Comments</Label>
                <Textarea
                  id="edit-system-comments"
                  value={editingSystemRow.comments}
                  onChange={(e) => setEditingSystemRow({...editingSystemRow, comments: e.target.value})}
                />
              </div>
            </div>
          </div>
          
          <DialogFooter>
            <Button variant="outline" onClick={() => setIsEditingSystem(false)}>
              Cancel
            </Button>
            <Button onClick={handleUpdateSystemRow}>
              Save Changes
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    );
  };
  
  return (
    <div className="container mx-auto py-6 space-y-6">
      {/* Render the edit dialogs */}
      {renderAssetEditDialog()}
      {renderSystemEditDialog()}
      
      <h1 className="text-3xl font-bold tracking-tight">FMECA Analysis</h1>
      <p className="text-muted-foreground">
        Failure Mode, Effects, and Criticality Analysis is a structured approach to identifying potential
        failure modes in a system and their effects.
      </p>
      
      <Tabs defaultValue="asset-level" className="w-full" onValueChange={setSelectedTab}>
        <TabsList className="grid w-full grid-cols-2">
          <TabsTrigger value="asset-level" className="flex items-center">
            <FileText className="h-4 w-4 mr-2" />
            Individual Asset-Level FMECA
          </TabsTrigger>
          <TabsTrigger value="system-level" className="flex items-center">
            <Database className="h-4 w-4 mr-2" />
            System-Level FMECA
          </TabsTrigger>
        </TabsList>
        
        <TabsContent value="asset-level" className="mt-6">
          <Card>
            <CardHeader>
              <CardTitle>Individual Asset-Level FMECA</CardTitle>
              <CardDescription>
                Analyze specific assets (e.g., pumps, motors) by breaking them down into components like mechanical seals, bearings, and shafts.
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-2">
              <p className="text-sm">
                <strong>Structure:</strong> The asset-level FMECA begins with header information 
                (Tag Number, Asset Description, Function) followed by a detailed component breakdown.
              </p>
              <p className="text-sm">
                <strong>Example:</strong> For a centrifugal pump, components would include 
                Mechanical Seal, Bearing, Shaft, etc. with failure modes analyzed for each.
              </p>
            </CardContent>
          </Card>
          
          <div className="mt-6 p-6 border rounded-lg bg-white">
            <h2 className="text-xl font-bold mb-4">Asset-Level FMECA Sheet</h2>
            
            {/* RPN Guide and Matrix */}
            <div className="mb-6 p-4 bg-blue-50 border border-blue-200 rounded">
              <h3 className="font-semibold text-blue-800">RPN (Risk Priority Number) Guide</h3>
              <p className="text-sm text-blue-700 mt-1">
                RPN = Severity × Probability × Detection (Range: 1-1000)
              </p>
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mt-3">
                <div className="p-2 rounded bg-red-100 border border-red-200">
                  <span className="font-bold text-red-700">High Risk (RPN ≥ 200)</span>
                  <p className="text-xs text-red-600 mt-1">Immediate action required. Critical priority for risk mitigation.</p>
                </div>
                <div className="p-2 rounded bg-amber-100 border border-amber-200">
                  <span className="font-bold text-amber-700">Medium Risk (125-200)</span>
                  <p className="text-xs text-amber-600 mt-1">Action needed soon. Secondary priority for risk mitigation.</p>
                </div>
                <div className="p-2 rounded bg-green-100 border border-green-200">
                  <span className="font-bold text-green-700">Low Risk (under 125)</span>
                  <p className="text-xs text-green-600 mt-1">Monitor and address during routine maintenance.</p>
                </div>
              </div>
            </div>
            
            <div className="mb-6 p-4 bg-amber-50 border-l-4 border-amber-500 rounded">
              <h3 className="font-semibold text-amber-800">Example Asset FMECA</h3>
              <p className="text-sm text-amber-700 mt-1">
                Here's an example of a completed Asset-Level FMECA for a Centrifugal Pump:
              </p>
              <div className="grid grid-cols-3 gap-2 mt-3">
                <div className="text-sm">
                  <span className="font-medium">Tag Number:</span> Pump-101
                </div>
                <div className="text-sm">
                  <span className="font-medium">Description:</span> Centrifugal Pump
                </div>
                <div className="text-sm">
                  <span className="font-medium">Function:</span> Delivers fluid to main system
                </div>
              </div>
              <div className="mt-2 text-sm text-amber-700">
                <span className="font-medium">Example Components:</span> Mechanical Seal (RPN 144, Medium Risk), Bearing (RPN 140, Medium Risk), Shaft (RPN 150, Medium Risk)
              </div>
            </div>
            
            {/* Asset Information Form */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6 p-4 bg-slate-50 rounded-md">
              <div>
                <Label className="text-sm font-medium">Tag Number:</Label>
                <Input 
                  className="mt-1" 
                  placeholder="e.g., Pump-101" 
                  value={assetTagNumber}
                  onChange={(e) => setAssetTagNumber(e.target.value)}
                />
              </div>
              <div>
                <Label className="text-sm font-medium">Asset Description:</Label>
                <Input 
                  className="mt-1" 
                  placeholder="e.g., Centrifugal Pump" 
                  value={assetDescription}
                  onChange={(e) => setAssetDescription(e.target.value)}
                />
              </div>
              <div>
                <Label className="text-sm font-medium">Function:</Label>
                <Input 
                  className="mt-1" 
                  placeholder="e.g., Delivers fluid to main system" 
                  value={assetFunction}
                  onChange={(e) => setAssetFunction(e.target.value)}
                />
              </div>
            </div>
            
            {/* FMECA Table */}
            <div className="overflow-x-auto">
              {assetRows.length > 0 ? (
                <div className="space-y-6">
                  {/* Group rows by tag number */}
                  {Array.from(new Set(assetRows.map(row => row.tagNumber))).map(tagNumber => {
                    const assetRowsForTag = assetRows.filter(row => row.tagNumber === tagNumber);
                    const firstRow = assetRowsForTag[0];
                    
                    return (
                      <div key={tagNumber} className="border rounded-md overflow-hidden">
                        {/* Asset Information Header */}
                        <div className="p-4 bg-blue-50 border-b border-blue-100">
                          <div className="grid grid-cols-3 gap-4">
                            <div>
                              <h3 className="font-medium text-blue-800">Tag Number:</h3>
                              <p className="font-bold">{firstRow.tagNumber}</p>
                            </div>
                            <div>
                              <h3 className="font-medium text-blue-800">Asset Description:</h3>
                              <p>{firstRow.assetDescription}</p>
                            </div>
                            <div>
                              <h3 className="font-medium text-blue-800">Function:</h3>
                              <p>{firstRow.assetFunction}</p>
                            </div>
                          </div>
                        </div>
                        
                        {/* Asset Components Table */}
                        <table className="min-w-full border-collapse">
                          <thead>
                            <tr className="bg-slate-100">
                              <th className="border border-gray-300 p-2 text-left">Component</th>
                              <th className="border border-gray-300 p-2 text-left">Failure Mode</th>
                              <th className="border border-gray-300 p-2 text-left">Cause</th>
                              <th className="border border-gray-300 p-2 text-left">Effect</th>
                              <th className="border border-gray-300 p-2 text-left">Severity</th>
                              <th className="border border-gray-300 p-2 text-left">Probability</th>
                              <th className="border border-gray-300 p-2 text-left">Detection</th>
                              <th className="border border-gray-300 p-2 text-left">RPN</th>
                              <th className="border border-gray-300 p-2 text-left">Risk Level</th>
                              <th className="border border-gray-300 p-2 text-left">Action Required</th>
                              <th className="border border-gray-300 p-2 text-left">Responsibility</th>
                              <th className="border border-gray-300 p-2 text-left">Target Date</th>
                              <th className="border border-gray-300 p-2 text-left bg-green-50">Completion Date</th>
                              <th className="border border-gray-300 p-2 text-left bg-green-50">Verified By</th>
                              <th className="border border-gray-300 p-2 text-left bg-green-50">Effectiveness</th>
                              <th className="border border-gray-300 p-2 text-left">Comments</th>
                              <th className="border border-gray-300 p-2 text-center">Actions</th>
                            </tr>
                          </thead>
                          <tbody>
                            {assetRowsForTag.map((row) => (
                              <tr key={row.id}>
                                <td className="border border-gray-300 p-2">{row.component}</td>
                                <td className="border border-gray-300 p-2">{row.failureMode}</td>
                                <td className="border border-gray-300 p-2">{row.cause}</td>
                                <td className="border border-gray-300 p-2">{row.effect}</td>
                                <td className="border border-gray-300 p-2">{row.severity}</td>
                                <td className="border border-gray-300 p-2">{row.probability}</td>
                                <td className="border border-gray-300 p-2">{row.detection}</td>
                                <td className="border border-gray-300 p-2">
                                  <span className={`font-bold ${getColorByRpn(row.rpn)}`}>
                                    {row.rpn}
                                  </span>
                                </td>
                                <td className="border border-gray-300 p-2">
                                  <Badge className={getColorClassByRpn(row.rpn)}>
                                    {getRiskLevelByRpn(row.rpn)}
                                  </Badge>
                                </td>
                                <td className="border border-gray-300 p-2">{row.action}</td>
                                <td className="border border-gray-300 p-2">{row.responsibility}</td>
                                <td className="border border-gray-300 p-2">{row.targetDate}</td>
                                <td className="border border-gray-300 p-2 bg-green-50">{row.completionDate || "Not completed"}</td>
                                <td className="border border-gray-300 p-2 bg-green-50">{row.verifiedBy || "Not verified"}</td>
                                <td className="border border-gray-300 p-2 bg-green-50">
                                  {row.effectivenessVerified === 'yes' ? "Yes" : 
                                   row.effectivenessVerified === 'no' ? "No" : 
                                   row.effectivenessVerified === 'partial' ? "Partial" : "Not verified"}
                                </td>
                                <td className="border border-gray-300 p-2">{row.comments}</td>
                                <td className="border border-gray-300 p-2 text-center">
                                  <div className="flex gap-2 justify-center">
                                    <Button 
                                      variant="outline" 
                                      size="sm"
                                      onClick={() => handleEditAssetRow(row)}
                                    >
                                      <Edit className="h-4 w-4 mr-1" />
                                      <span>Edit</span>
                                    </Button>
                                    <Button 
                                      variant="destructive" 
                                      size="sm"
                                      onClick={() => handleDeleteAssetRow(row.id)}
                                    >
                                      <Trash className="h-4 w-4 mr-1" />
                                      <span>Delete</span>
                                    </Button>
                                  </div>
                                </td>
                              </tr>
                            ))}
                          </tbody>
                        </table>
                      </div>
                    );
                  })}
                </div>
              ) : (
                <div className="border border-gray-300 p-6 text-center rounded">
                  <p className="text-gray-500">No data available. Add a new row to begin your FMECA.</p>
                </div>
              )}
            </div>
            
            {/* Add New Row Form */}
            <div className="mt-4 p-4 bg-slate-50 rounded-md">
              <h3 className="text-md font-semibold mb-3">Add New FMECA Row</h3>
              <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-4">
                <div>
                  <Label className="text-sm font-medium">Component:</Label>
                  <Input 
                    id="new-component" 
                    placeholder="e.g., Mechanical Seal"
                    className="mt-1"
                  />
                </div>
                <div>
                  <Label className="text-sm font-medium">Failure Mode:</Label>
                  <Input 
                    id="new-failure-mode" 
                    placeholder="e.g., Leakage"
                    className="mt-1"
                  />
                </div>
                <div>
                  <Label className="text-sm font-medium">Cause:</Label>
                  <Input 
                    id="new-cause" 
                    placeholder="e.g., Wear and tear"
                    className="mt-1"
                  />
                </div>
                <div>
                  <Label className="text-sm font-medium">Effect:</Label>
                  <Input 
                    id="new-effect" 
                    placeholder="e.g., Fluid leakage, operational halt"
                    className="mt-1"
                  />
                </div>
              </div>
              
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-4">
                <div>
                  <Label className="text-sm font-medium">Severity (S):</Label>
                  <Select 
                    onValueChange={(value) => handleAssetRatingChange('severity', parseInt(value))}
                    defaultValue="5"
                  >
                    <SelectTrigger className="mt-1">
                      <SelectValue placeholder="Select..." />
                    </SelectTrigger>
                    <SelectContent>
                      {[1, 2, 3, 4, 5, 6, 7, 8, 9, 10].map((value) => (
                        <SelectItem key={value} value={value.toString()}>
                          {value} - {value < 3 ? 'Minor' : value < 6 ? 'Moderate' : value < 9 ? 'Significant' : 'Critical'}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                  <Label className="text-sm font-medium mt-2">Severity Justification:</Label>
                  <Textarea 
                    id="severity-justification" 
                    className="mt-1" 
                    placeholder="e.g., Critical impact on process safety and operations"
                    value={assetSeverityJustification}
                    onChange={(e: React.ChangeEvent<HTMLTextAreaElement>) => setAssetSeverityJustification(e.target.value)}
                    required
                  />
                </div>
                <div>
                  <Label className="text-sm font-medium">Probability (P):</Label>
                  <Select 
                    onValueChange={(value) => handleAssetRatingChange('probability', parseInt(value))}
                    defaultValue="5"
                  >
                    <SelectTrigger className="mt-1">
                      <SelectValue placeholder="Select..." />
                    </SelectTrigger>
                    <SelectContent>
                      {[1, 2, 3, 4, 5, 6, 7, 8, 9, 10].map((value) => (
                        <SelectItem key={value} value={value.toString()}>
                          {value} - {value < 3 ? 'Remote' : value < 6 ? 'Occasional' : value < 9 ? 'Likely' : 'Almost Certain'}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                  <Label className="text-sm font-medium mt-2">Probability Justification:</Label>
                  <Textarea 
                    id="probability-justification" 
                    className="mt-1" 
                    placeholder="e.g., Based on historical failure data and MTBF analysis"
                    value={assetProbabilityJustification}
                    onChange={(e: React.ChangeEvent<HTMLTextAreaElement>) => setAssetProbabilityJustification(e.target.value)}
                    required
                  />
                </div>
                <div>
                  <Label className="text-sm font-medium">Detection (D):</Label>
                  <Select 
                    onValueChange={(value) => handleAssetRatingChange('detection', parseInt(value))}
                    defaultValue="5"
                  >
                    <SelectTrigger className="mt-1">
                      <SelectValue placeholder="Select..." />
                    </SelectTrigger>
                    <SelectContent>
                      {[1, 2, 3, 4, 5, 6, 7, 8, 9, 10].map((value) => (
                        <SelectItem key={value} value={value.toString()}>
                          {value} - {value < 3 ? 'Almost Certain' : value < 6 ? 'High' : value < 9 ? 'Low' : 'Almost Impossible'}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                  <Label className="text-sm font-medium mt-2">Detection Justification:</Label>
                  <Textarea 
                    id="detection-justification" 
                    className="mt-1" 
                    placeholder="e.g., No sensors or indicators to detect this failure mode"
                    value={assetDetectionJustification}
                    onChange={(e: React.ChangeEvent<HTMLTextAreaElement>) => setAssetDetectionJustification(e.target.value)}
                    required
                  />
                </div>
              </div>
              
              <div className="mb-4">
                <Label className="text-sm font-medium">RPN (Auto-calculated):</Label>
                <div className="h-10 flex items-center px-4 mt-1 border rounded-md bg-slate-100">
                  <span id="calculated-rpn" className="font-bold">{calculateAssetRpn()}</span>
                  {calculateAssetRpn() > 0 && (
                    <Badge 
                      className={`ml-2 ${getColorClassByRpn(calculateAssetRpn())}`}
                    >
                      {getRiskLevelByRpn(calculateAssetRpn())}
                    </Badge>
                  )}
                </div>
              </div>
              
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-4">
                <div>
                  <Label className="text-sm font-medium">Action Required:</Label>
                  <Input 
                    id="new-action" 
                    placeholder="e.g., Replace seals periodically"
                    className="mt-1"
                  />
                </div>
                <div>
                  <Label className="text-sm font-medium">Responsibility:</Label>
                  <Input 
                    id="new-responsibility" 
                    placeholder="e.g., Maintenance Team"
                    className="mt-1"
                  />
                </div>
                <div>
                  <Label className="text-sm font-medium">Target Date:</Label>
                  <Input 
                    id="new-target-date" 
                    type="date"
                    className="mt-1"
                  />
                </div>
              </div>
              
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-4 p-2 bg-green-50 border border-green-100 rounded">
                <div>
                  <Label className="text-sm font-medium">Completion Date:</Label>
                  <Input 
                    id="new-completion-date" 
                    type="date"
                    className="mt-1"
                  />
                </div>
                <div>
                  <Label className="text-sm font-medium">Verified By:</Label>
                  <Input 
                    id="new-verified-by" 
                    placeholder="e.g., J. Smith"
                    className="mt-1"
                  />
                </div>
                <div>
                  <Label className="text-sm font-medium">Effectiveness Verified:</Label>
                  <Select 
                    defaultValue=""
                  >
                    <SelectTrigger className="mt-1">
                      <SelectValue placeholder="Select..." />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="">Not verified</SelectItem>
                      <SelectItem value="yes">Yes</SelectItem>
                      <SelectItem value="no">No</SelectItem>
                      <SelectItem value="partial">Partial</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>
              
              <div className="mb-4">
                <Label className="text-sm font-medium">Comments/Notes:</Label>
                <Input 
                  id="new-comments" 
                  placeholder="e.g., Monitor wear during inspections"
                  className="mt-1"
                />
              </div>
              
              <div className="flex justify-end">
                <Button 
                  className="mt-2"
                  onClick={handleAddAssetRow}
                >
                  <Plus className="h-4 w-4 mr-2" />
                  Add FMECA Row
                </Button>
              </div>
            </div>
            
            <div className="mt-6 flex justify-between">
              <Button variant="outline" onClick={handleClearAssetFmeca}>
                Clear FMECA
              </Button>
              <Button onClick={handleSaveAssetFmeca}>
                Save FMECA
              </Button>
            </div>
          </div>
        </TabsContent>
        
        <TabsContent value="system-level" className="mt-6">
          <Card>
            <CardHeader>
              <CardTitle>System-Level FMECA</CardTitle>
              <CardDescription>
                Analyze entire systems (e.g., boiler systems, HVAC systems) by evaluating subsystems like burners, gas systems, and automation.
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-2">
              <p className="text-sm">
                <strong>Structure:</strong> The system-level FMECA begins with header information
                (System Name, Description, Primary Function) followed by a subsystem analysis.
              </p>
              <p className="text-sm">
                <strong>Example:</strong> For a boiler system, subsystems would include 
                Burner, Gas System, Automation & Control, etc. with failure modes analyzed for each.
              </p>
            </CardContent>
          </Card>
          
          <div className="mt-6 p-6 border rounded-lg bg-white">
            <h2 className="text-xl font-bold mb-4">System-Level FMECA Sheet</h2>
            
            {/* RPN Guide and Matrix */}
            <div className="mb-6 p-4 bg-blue-50 border border-blue-200 rounded">
              <h3 className="font-semibold text-blue-800">RPN (Risk Priority Number) Guide</h3>
              <p className="text-sm text-blue-700 mt-1">
                RPN = Severity × Probability × Detection (Range: 1-1000)
              </p>
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mt-3">
                <div className="p-2 rounded bg-red-100 border border-red-200">
                  <span className="font-bold text-red-700">High Risk (RPN ≥ 200)</span>
                  <p className="text-xs text-red-600 mt-1">Immediate action required. Critical priority for risk mitigation.</p>
                </div>
                <div className="p-2 rounded bg-amber-100 border border-amber-200">
                  <span className="font-bold text-amber-700">Medium Risk (125-200)</span>
                  <p className="text-xs text-amber-600 mt-1">Action needed soon. Secondary priority for risk mitigation.</p>
                </div>
                <div className="p-2 rounded bg-green-100 border border-green-200">
                  <span className="font-bold text-green-700">Low Risk (under 125)</span>
                  <p className="text-xs text-green-600 mt-1">Monitor and address during routine maintenance.</p>
                </div>
              </div>
            </div>
            
            <div className="mb-6 p-4 bg-amber-50 border-l-4 border-amber-500 rounded">
              <h3 className="font-semibold text-amber-800">Example System FMECA</h3>
              <p className="text-sm text-amber-700 mt-1">
                Here's an example of a completed System-Level FMECA for a Boiler System:
              </p>
              <div className="grid grid-cols-3 gap-2 mt-3">
                <div className="text-sm">
                  <span className="font-medium">System Name:</span> Boiler System
                </div>
                <div className="text-sm">
                  <span className="font-medium">Description:</span> Generates process steam
                </div>
                <div className="text-sm">
                  <span className="font-medium">Function:</span> Provides heat and steam
                </div>
              </div>
              <div className="mt-2 text-sm text-amber-700">
                <span className="font-medium">Example Subsystems:</span> Burner (RPN 108, Low Risk), Gas System (RPN 150, Medium Risk), Automation & Control (RPN 160, Medium Risk)
              </div>
            </div>
            
            {/* System Information Form */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6 p-4 bg-slate-50 rounded-md">
              <div>
                <Label className="text-sm font-medium">System Name:</Label>
                <Input 
                  className="mt-1" 
                  placeholder="e.g., Boiler System" 
                  value={systemName}
                  onChange={(e) => setSystemName(e.target.value)}
                />
              </div>
              <div>
                <Label className="text-sm font-medium">Description:</Label>
                <Input 
                  className="mt-1" 
                  placeholder="e.g., Generates process steam" 
                  value={systemDescription}
                  onChange={(e) => setSystemDescription(e.target.value)}
                />
              </div>
              <div>
                <Label className="text-sm font-medium">Primary Function:</Label>
                <Input 
                  className="mt-1" 
                  placeholder="e.g., Provides heat and steam" 
                  value={systemFunction}
                  onChange={(e) => setSystemFunction(e.target.value)}
                />
              </div>
            </div>
            
            {/* FMECA Table */}
            <div className="overflow-x-auto">
              {systemRows.length > 0 ? (
                <div className="space-y-6">
                  {/* Group rows by system name */}
                  {Array.from(new Set(systemRows.map(row => row.systemName))).map(systemName => {
                    const systemRowsForName = systemRows.filter(row => row.systemName === systemName);
                    const firstRow = systemRowsForName[0];
                    
                    return (
                      <div key={systemName} className="border rounded-md overflow-hidden">
                        {/* System Information Header */}
                        <div className="p-4 bg-green-50 border-b border-green-100">
                          <div className="grid grid-cols-2 gap-4">
                            <div>
                              <h3 className="font-medium text-green-800">System Name:</h3>
                              <p className="font-bold">{firstRow.systemName}</p>
                            </div>
                            <div>
                              <h3 className="font-medium text-green-800">Function:</h3>
                              <p>{firstRow.systemFunction}</p>
                            </div>
                          </div>
                        </div>
                        
                        {/* System Components Table */}
                        <table className="min-w-full border-collapse">
                          <thead>
                            <tr className="bg-slate-100">
                              <th className="border border-gray-300 p-2 text-left">Subsystem</th>
                              <th className="border border-gray-300 p-2 text-left">Failure Mode</th>
                              <th className="border border-gray-300 p-2 text-left">Cause</th>
                              <th className="border border-gray-300 p-2 text-left">Effect</th>
                              <th className="border border-gray-300 p-2 text-left">Severity</th>
                              <th className="border border-gray-300 p-2 text-left">Probability</th>
                              <th className="border border-gray-300 p-2 text-left">Detection</th>
                              <th className="border border-gray-300 p-2 text-left">RPN</th>
                              <th className="border border-gray-300 p-2 text-left">Risk Level</th>
                              <th className="border border-gray-300 p-2 text-left">Action Required</th>
                              <th className="border border-gray-300 p-2 text-left">Responsibility</th>
                              <th className="border border-gray-300 p-2 text-left">Target Date</th>
                              <th className="border border-gray-300 p-2 text-left bg-green-50">Completion Date</th>
                              <th className="border border-gray-300 p-2 text-left bg-green-50">Verified By</th>
                              <th className="border border-gray-300 p-2 text-left bg-green-50">Effectiveness</th>
                              <th className="border border-gray-300 p-2 text-left">Comments</th>
                              <th className="border border-gray-300 p-2 text-center">Actions</th>
                            </tr>
                          </thead>
                          <tbody>
                            {systemRowsForName.map((row) => (
                              <tr key={row.id}>
                                <td className="border border-gray-300 p-2">{row.subsystem}</td>
                                <td className="border border-gray-300 p-2">{row.failureMode}</td>
                                <td className="border border-gray-300 p-2">{row.cause}</td>
                                <td className="border border-gray-300 p-2">{row.effect}</td>
                                <td className="border border-gray-300 p-2">{row.severity}</td>
                                <td className="border border-gray-300 p-2">{row.probability}</td>
                                <td className="border border-gray-300 p-2">{row.detection}</td>
                                <td className="border border-gray-300 p-2">
                                  <span className={`font-bold ${getColorByRpn(row.rpn)}`}>
                                    {row.rpn}
                                  </span>
                                </td>
                                <td className="border border-gray-300 p-2">
                                  <Badge className={getColorClassByRpn(row.rpn)}>
                                    {getRiskLevelByRpn(row.rpn)}
                                  </Badge>
                                </td>
                                <td className="border border-gray-300 p-2">{row.action}</td>
                                <td className="border border-gray-300 p-2">{row.responsibility}</td>
                                <td className="border border-gray-300 p-2">{row.targetDate}</td>
                                <td className="border border-gray-300 p-2 bg-green-50">{row.completionDate || "Not completed"}</td>
                                <td className="border border-gray-300 p-2 bg-green-50">{row.verifiedBy || "Not verified"}</td>
                                <td className="border border-gray-300 p-2 bg-green-50">
                                  {row.effectivenessVerified === 'yes' ? "Yes" : 
                                   row.effectivenessVerified === 'no' ? "No" : 
                                   row.effectivenessVerified === 'partial' ? "Partial" : "Not verified"}
                                </td>
                                <td className="border border-gray-300 p-2">{row.comments}</td>
                                <td className="border border-gray-300 p-2 text-center">
                                  <div className="flex gap-2 justify-center">
                                    <Button 
                                      variant="outline" 
                                      size="sm"
                                      onClick={() => handleEditSystemRow(row)}
                                    >
                                      <Edit className="h-4 w-4 mr-1" />
                                      <span>Edit</span>
                                    </Button>
                                    <Button 
                                      variant="destructive" 
                                      size="sm"
                                      onClick={() => handleDeleteSystemRow(row.id)}
                                    >
                                      <Trash className="h-4 w-4 mr-1" />
                                      <span>Delete</span>
                                    </Button>
                                  </div>
                                </td>
                              </tr>
                            ))}
                          </tbody>
                        </table>
                      </div>
                    );
                  })}
                </div>
              ) : (
                <div className="border border-gray-300 p-6 text-center rounded">
                  <p className="text-gray-500">No data available. Add a new row to begin your system-level FMECA.</p>
                </div>
              )}
            </div>
            
            {/* Add New Row Form */}
            <div className="mt-4 p-4 bg-slate-50 rounded-md">
              <h3 className="text-md font-semibold mb-3">Add New FMECA Row</h3>
              <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-4">
                <div>
                  <Label className="text-sm font-medium">Subsystem:</Label>
                  <Input 
                    id="new-subsystem" 
                    placeholder="e.g., Burner"
                    className="mt-1"
                  />
                </div>
                <div>
                  <Label className="text-sm font-medium">Failure Mode:</Label>
                  <Input 
                    id="new-system-failure-mode" 
                    placeholder="e.g., Flame failure"
                    className="mt-1"
                  />
                </div>
                <div>
                  <Label className="text-sm font-medium">Cause:</Label>
                  <Input 
                    id="new-system-cause" 
                    placeholder="e.g., Blocked fuel nozzle"
                    className="mt-1"
                  />
                </div>
                <div>
                  <Label className="text-sm font-medium">Effect:</Label>
                  <Input 
                    id="new-system-effect" 
                    placeholder="e.g., Loss of heat generation"
                    className="mt-1"
                  />
                </div>
              </div>
              
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-4">
                <div>
                  <Label className="text-sm font-medium">Severity (S):</Label>
                  <Select 
                    onValueChange={(value) => handleSystemRatingChange('severity', parseInt(value))}
                    defaultValue="5"
                  >
                    <SelectTrigger className="mt-1">
                      <SelectValue placeholder="Select..." />
                    </SelectTrigger>
                    <SelectContent>
                      {[1, 2, 3, 4, 5, 6, 7, 8, 9, 10].map((value) => (
                        <SelectItem key={value} value={value.toString()}>
                          {value} - {value < 3 ? 'Minor' : value < 6 ? 'Moderate' : value < 9 ? 'Significant' : 'Critical'}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                  <Label className="text-sm font-medium mt-2">Severity Justification:</Label>
                  <Textarea 
                    id="system-severity-justification" 
                    className="mt-1" 
                    placeholder="e.g., Complete system shutdown with significant safety implications"
                    value={systemSeverityJustification}
                    onChange={(e: React.ChangeEvent<HTMLTextAreaElement>) => setSystemSeverityJustification(e.target.value)}
                    required
                  />
                </div>
                <div>
                  <Label className="text-sm font-medium">Probability (P):</Label>
                  <Select 
                    onValueChange={(value) => handleSystemRatingChange('probability', parseInt(value))}
                    defaultValue="5"
                  >
                    <SelectTrigger className="mt-1">
                      <SelectValue placeholder="Select..." />
                    </SelectTrigger>
                    <SelectContent>
                      {[1, 2, 3, 4, 5, 6, 7, 8, 9, 10].map((value) => (
                        <SelectItem key={value} value={value.toString()}>
                          {value} - {value < 3 ? 'Remote' : value < 6 ? 'Occasional' : value < 9 ? 'Likely' : 'Almost Certain'}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                  <Label className="text-sm font-medium mt-2">Probability Justification:</Label>
                  <Textarea 
                    id="system-probability-justification" 
                    className="mt-1" 
                    placeholder="e.g., Based on system reliability data and maintenance history"
                    value={systemProbabilityJustification}
                    onChange={(e: React.ChangeEvent<HTMLTextAreaElement>) => setSystemProbabilityJustification(e.target.value)}
                    required
                  />
                </div>
                <div>
                  <Label className="text-sm font-medium">Detection (D):</Label>
                  <Select 
                    onValueChange={(value) => handleSystemRatingChange('detection', parseInt(value))}
                    defaultValue="5"
                  >
                    <SelectTrigger className="mt-1">
                      <SelectValue placeholder="Select..." />
                    </SelectTrigger>
                    <SelectContent>
                      {[1, 2, 3, 4, 5, 6, 7, 8, 9, 10].map((value) => (
                        <SelectItem key={value} value={value.toString()}>
                          {value} - {value < 3 ? 'Almost Certain' : value < 6 ? 'High' : value < 9 ? 'Low' : 'Almost Impossible'}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                  <Label className="text-sm font-medium mt-2">Detection Justification:</Label>
                  <Textarea 
                    id="system-detection-justification" 
                    className="mt-1" 
                    placeholder="e.g., Limited monitoring capabilities and infrequent inspections"
                    value={systemDetectionJustification}
                    onChange={(e: React.ChangeEvent<HTMLTextAreaElement>) => setSystemDetectionJustification(e.target.value)}
                    required
                  />
                </div>
              </div>
              
              <div className="mb-4">
                <Label className="text-sm font-medium">RPN (Auto-calculated):</Label>
                <div className="h-10 flex items-center px-4 mt-1 border rounded-md bg-slate-100">
                  <span id="calculated-system-rpn" className="font-bold">{calculateSystemRpn()}</span>
                  {calculateSystemRpn() > 0 && (
                    <Badge 
                      className={`ml-2 ${getColorClassByRpn(calculateSystemRpn())}`}
                    >
                      {getRiskLevelByRpn(calculateSystemRpn())}
                    </Badge>
                  )}
                </div>
              </div>
              
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-4">
                <div>
                  <Label className="text-sm font-medium">Action Required:</Label>
                  <Input 
                    id="new-system-action" 
                    placeholder="e.g., Inspect and clean regularly"
                    className="mt-1"
                  />
                </div>
                <div>
                  <Label className="text-sm font-medium">Responsibility:</Label>
                  <Input 
                    id="new-system-responsibility" 
                    placeholder="e.g., Engineering Team"
                    className="mt-1"
                  />
                </div>
                <div>
                  <Label className="text-sm font-medium">Target Date:</Label>
                  <Input 
                    id="new-system-target-date" 
                    type="date"
                    className="mt-1"
                  />
                </div>
              </div>
              
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-4 p-2 bg-green-50 border border-green-100 rounded">
                <div>
                  <Label className="text-sm font-medium">Completion Date:</Label>
                  <Input 
                    id="new-system-completion-date" 
                    type="date"
                    className="mt-1"
                  />
                </div>
                <div>
                  <Label className="text-sm font-medium">Verified By:</Label>
                  <Input 
                    id="new-system-verified-by" 
                    placeholder="e.g., J. Smith"
                    className="mt-1"
                  />
                </div>
                <div>
                  <Label className="text-sm font-medium">Effectiveness Verified:</Label>
                  <Select 
                    defaultValue=""
                  >
                    <SelectTrigger className="mt-1">
                      <SelectValue placeholder="Select..." />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="">Not verified</SelectItem>
                      <SelectItem value="yes">Yes</SelectItem>
                      <SelectItem value="no">No</SelectItem>
                      <SelectItem value="partial">Partial</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>
              
              <div className="mb-4">
                <Label className="text-sm font-medium">Comments/Notes:</Label>
                <Input 
                  id="new-system-comments" 
                  placeholder="e.g., Use automated flame monitoring"
                  className="mt-1"
                />
              </div>
              
              <div className="flex justify-end">
                <Button 
                  className="mt-2"
                  onClick={handleAddSystemRow}
                >
                  <Plus className="h-4 w-4 mr-2" />
                  Add FMECA Row
                </Button>
              </div>
            </div>
            
            <div className="mt-6 flex justify-between">
              <Button variant="outline" onClick={handleClearSystemFmeca}>
                Clear FMECA
              </Button>
              <Button onClick={handleSaveSystemFmeca}>
                Save FMECA
              </Button>
            </div>
          </div>
        </TabsContent>
      </Tabs>
    </div>
  );
};

export default FmecaPage;