import {
  Entity,
  Column,
  PrimaryColumn,
  Index,
  CreateDateColumn,
  UpdateDateColumn,
} from "typeorm";

@Entity("student_test_results")
@Index(["testId", "obtainedMarks"])
//@Check(`"marksObtained" >= 0`) //Ensures that Obtainable Marks aren't negative
//@Check(`"marksAvailable" >=0`) //Ensures that Available Marks aren't negative
//@Check(`"marksObtained" <= "marksAvailable"`) //Ensures that Obtainable Marks are always less than Marks Available
//Compose Primary Key is created on studentNum/testId, so they must be UNIQUE.
export class StudentTestResult {
  @Index() //We also fetch student numbers
  @PrimaryColumn({ type: "varchar" })
  studentNumber!: string; //Not null Assertion

  @Index() //Because we're fetching testID
  @PrimaryColumn({ type: "varchar" })
  testId!: string;

  @Column({ type: "timestamptz" })
  scannedOn!: Date;

  @Column({ type: "varchar", length: 255 })
  firstName!: string;

  @Column({ type: "varchar", length: 255 })
  lastName!: string;

  @Column({ type: "integer" })
  availableMarks!: number;

  @Column({ type: "integer" })
  obtainedMarks!: number;

  @CreateDateColumn()
  createdAt!: Date;

  @UpdateDateColumn()
  updatedAt!: Date;
}
