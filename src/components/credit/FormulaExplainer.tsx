"use client";

import React from "react";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { AlertCircle } from "lucide-react";
import { Alert, AlertDescription } from "@/components/ui/alert";

interface FormulaExplainerProps {
  className?: string;
}

export function FormulaExplainer({ className }: FormulaExplainerProps) {
  return (
    <Card className={className}>
      <CardHeader>
        <CardTitle>Credit System Formulas</CardTitle>
        <CardDescription>
          How collateral, borrowing limits, and health factors are calculated
        </CardDescription>
      </CardHeader>
      <CardContent>
        <div className="space-y-6">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead className="w-[200px]">Metric</TableHead>
                <TableHead>Formula</TableHead>
                <TableHead>Description</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              <TableRow>
                <TableCell className="font-medium">
                  Loan-to-Value (LTV)
                </TableCell>
                <TableCell className="font-mono">50%</TableCell>
                <TableCell>
                  Maximum percentage of collateral value that can be borrowed
                </TableCell>
              </TableRow>
              <TableRow>
                <TableCell className="font-medium">
                  Maximum Borrowable
                </TableCell>
                <TableCell className="font-mono">
                  collateralAmount × 0.5
                </TableCell>
                <TableCell>
                  Maximum amount that can be borrowed based on your collateral
                </TableCell>
              </TableRow>
              <TableRow>
                <TableCell className="font-medium">
                  Available to Borrow
                </TableCell>
                <TableCell className="font-mono">
                  maxBorrowable − currentDebt
                </TableCell>
                <TableCell>
                  How much more you can borrow with your current collateral
                </TableCell>
              </TableRow>
              <TableRow>
                <TableCell className="font-medium">Health Factor</TableCell>
                <TableCell className="font-mono">
                  (collateralAmount × 0.5) ÷ totalDebt
                </TableCell>
                <TableCell>
                  Ratio of borrowing power to debt (below 1.2 is risky, below
                  1.0 can be liquidated)
                </TableCell>
              </TableRow>
              <TableRow>
                <TableCell className="font-medium">Credit Limit</TableCell>
                <TableCell className="font-mono">
                  Based on credit score tier:
                  <br />
                  - Dormant: $1,000
                  <br />
                  - Citizen: $3,000
                  <br />
                  - Basic: $5,000
                  <br />
                  - Ally: $10,000
                  <br />- Sovereign: $15,000
                </TableCell>
                <TableCell>
                  Maximum credit available based on your on-chain credit score
                </TableCell>
              </TableRow>
              <TableRow>
                <TableCell className="font-medium">Interest Rates</TableCell>
                <TableCell className="font-mono">
                  Based on credit score tier:
                  <br />
                  - Dormant: 1.8x
                  <br />
                  - Citizen: 1.5x
                  <br />
                  - Basic: 1.2x
                  <br />
                  - Ally: 1x
                  <br />- Sovereign: 0.8x
                </TableCell>
                <TableCell>
                  Interest rate applied to your outstanding balance (dynamically
                  multiplied by Aave base rate)
                </TableCell>
              </TableRow>
              <TableRow>
                <TableCell className="font-medium">Cashback Rewards</TableCell>
                <TableCell className="font-mono">
                  Based on credit score tier:
                  <br />
                  - Dormant: 0%
                  <br />
                  - Citizen: 0.5%
                  <br />
                  - Basic: 1%
                  <br />
                  - Ally: 2%
                  <br />- Sovereign: 3%
                </TableCell>
                <TableCell>
                  Percentage of purchase value returned as cashback rewards in
                  GNO tokens
                </TableCell>
              </TableRow>
            </TableBody>
          </Table>

          <Alert>
            <AlertCircle className="h-4 w-4" />
            <AlertDescription>
              The health factor is a key safety metric. Maintain it above 1.2 to
              avoid liquidation risk.
            </AlertDescription>
          </Alert>
        </div>
      </CardContent>
    </Card>
  );
}
