import { IsString, IsNotEmpty } from 'class-validator';

export class DecisionTransferDto {
  @IsString()
  @IsNotEmpty()
  decisionNote!: string;
}
