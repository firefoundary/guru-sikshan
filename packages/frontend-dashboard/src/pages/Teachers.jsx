import React from "react";
import DashboardLayout from "../layout/DashboardLayout";
import TeacherTable from "../components/TeacherTable";

const Teachers = () => {
  return (
    <DashboardLayout>
      <TeacherTable />
    </DashboardLayout>
  );
};

export default Teachers;