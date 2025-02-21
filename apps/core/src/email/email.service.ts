import {MailerService} from '@nestjs-modules/mailer';
import {
  BadRequestException,
  Injectable,
  InternalServerErrorException,
  Logger,
  NotFoundException,
} from '@nestjs/common';
import {InjectRepository} from '@nestjs/typeorm';
import {Repository} from 'typeorm';
import {join} from 'path';
import {v4 as uuidv4} from 'uuid';
import * as dotenv from 'dotenv';
import {EmailTypeEnum} from '@ezyfs/common/enums';
import {Email} from '@ezyfs/repositories/entities';
import {User} from '@ezyfs/repositories/entities';
import {DatesOperations} from '../utils/dates-operation';
import {
  CONFIRMATION_EMAIL_SUBJECT,
  CONFIRMATION_EMAIL_TEMPLATE_NAME,
  EMAIL_EXPIRED_ERROR_MESSAGE,
  EMAIL_NOT_FOUND_ERROR_MESSAGE,
  RESET_PASSWORD_EMAIL_SUBJECT,
  RESET_PASSWORD_EMAIL_TEMPLATE_NAME,
  SENDING_EMAIL_ERROR_MESSAGE,
} from '../utils/constants';

dotenv.config();
@Injectable()
export class EmailService {
  constructor(
    @InjectRepository(Email)
    private readonly emailRepository: Repository<Email>,
    private readonly mailerService: MailerService,
  ) {}

  async create(createEmailInput: Email): Promise<Email> {
    const email = this.emailRepository.create(createEmailInput);
    return this.emailRepository.save(email);
  }

  async findAll(): Promise<Email[]> {
    return this.emailRepository.find();
  }

  async findOne(id: number): Promise<Email> {
    return this.emailRepository.findOne({where: {id}});
  }

  async findAllByUserId(userId: number): Promise<Email[]> {
    return this.emailRepository
      .createQueryBuilder('email')
      .where('email.sender.id = :userId', {userId})
      .getMany();
  }

  async sendEmail(user: User, emailType: EmailTypeEnum): Promise<boolean> {
    let subject;
    let templateName;

    switch (emailType) {
      case EmailTypeEnum.CONFIRMATION:
        subject = CONFIRMATION_EMAIL_SUBJECT;
        templateName = CONFIRMATION_EMAIL_TEMPLATE_NAME;
        break;
      case EmailTypeEnum.RESET_PASSWORD:
        subject = RESET_PASSWORD_EMAIL_SUBJECT;
        templateName = RESET_PASSWORD_EMAIL_TEMPLATE_NAME;
        break;
      default:
        throw new NotFoundException('Email type not found');
    }
    // create a new email and register it in the database

    const email = new Email()
      .setSender(user)
      .setEmailType(emailType)
      .setDate(new Date())
      .setToken(uuidv4())
      .setVerificationToken(uuidv4());

    await this.create(email);
    const {token, verificationToken} = email;
    const url = `${process.env.FRONT_END_BASE_URL}?sign_up_token=${token}&sign_up_verification_token=${verificationToken}&sign_up_user_id=${user.id}`;
    // build the email and send it
    this.mailerService
      .sendMail({
        to: user.email,
        subject,
        template: join(process.cwd(), `src/templates/${templateName}`),
        context: {
          userId: user.id,
          token,
          verificationToken,
          url,
        },
      })
      .then(() => true)
      .catch((err) => {
        Logger.log(err, 'SENDING EMAIL ERROR!');
        throw new InternalServerErrorException(SENDING_EMAIL_ERROR_MESSAGE);
      });
    return true;
  }

  /* the process is to send an email which has the a url with this pattern ?token=azaze&verifToken=aazda&userId=55
  once the user open the link we should verif that the token is valid and the mail didn't expired
  we mean by expiration if the user didn't confirm the mail for at least 2 days
  we get an email by its user id token and verification token and then if the email is expired we return false
  else we check the difference between the date of confirmation and the date of sending the email
  if this duration is bigger than 2 days we update the email and set its expiration field to true
  else we return true

  After we check, we should set the mail as expired to prevent the user of using it other times.
  */
  async confirmEmail(
    user: User,
    token: string,
    verificationToken: string,
    emailType: EmailTypeEnum,
  ) {
    const userId: number = user.id;
    const email: Email = await this.emailRepository
      .createQueryBuilder('email')
      .where(
        'email.sender.id = :userId and email.token = :token and email.verificationToken = :verificationToken and email.emailType = :emailType',
        {userId, token, verificationToken, emailType},
      )
      .getOne();

    if (email) {
      const {isExpired, sentDate} = email;
      if (isExpired) {
        throw new BadRequestException(EMAIL_EXPIRED_ERROR_MESSAGE);
      } else {
        const emailSendingDate: Date = sentDate;
        const confirmationDate: Date = new Date();

        const duration: number = DatesOperations.getDayDuration(
          emailSendingDate,
          confirmationDate,
        );
        const expiredEmail = email.setExpired(true);
        await this.emailRepository.save(expiredEmail);
        if (duration > 2) {
          throw new BadRequestException(EMAIL_EXPIRED_ERROR_MESSAGE);
        } else {
          return true;
        }
      }
    }

    throw new BadRequestException(EMAIL_NOT_FOUND_ERROR_MESSAGE);
  }
}
