import React from "react";
import DashboardLayout from "../layout/DashboardLayout";
import IssueTable from "../components/IssueTable"; // ✅ Imported here

const Feedback = () => {
  return (
    <DashboardLayout>
      {/* Container to give it some padding if needed */}
      <div className="w-full">
        {/* The IssueTable component already includes the "Teacher Feedback" header 
            and the Blue Table design, so we just drop it in here. */}
        <IssueTable />
      </div>
    </DashboardLayout>
  );
};

export default Feedback;