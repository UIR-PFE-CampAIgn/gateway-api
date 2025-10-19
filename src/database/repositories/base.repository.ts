import { ClientSession, FilterQuery, Model, UpdateQuery } from 'mongoose';

export class BaseRepository<T extends { _id: string }> {
  constructor(protected readonly model: Model<T>) {}

  create(data: Partial<T>, session?: ClientSession): Promise<T> {
    if (session) {
      return this.model
        .create([data], { session })
        .then((docs) => docs[0] as unknown as T);
    }
    return this.model.create(data) as unknown as Promise<T>;
  }

  findById(id: string, session?: ClientSession): Promise<T | null> {
    const q = this.model.findById(id).lean<T>();
    if (session) q.session(session);
    return q.exec();
  }

  findOne(filter: FilterQuery<T>, session?: ClientSession): Promise<T | null> {
    console.log('modelName', this.model.collection.name, 'filter', filter);
    const q = this.model.findOne(filter).lean<T>();
    if (session) q.session(session);
    return q.exec();
  }

  findMany(
    filter: FilterQuery<T>,
    options?: {
      limit?: number;
      skip?: number;
      sort?: any;
      session?: ClientSession;
    },
  ): Promise<T[]> {
    const q = this.model.find(filter).lean<T>();
    if (options?.session) q.session(options.session);
    if (options?.limit) q.limit(options.limit);
    if (options?.skip) q.skip(options.skip);
    if (options?.sort) q.sort(options.sort);
    return q.exec() as unknown as Promise<T[]>;
  }

  updateById(
    id: string,
    update: UpdateQuery<T>,
    session?: ClientSession,
  ): Promise<T | null> {
    const opts: any = { new: true };
    if (session) opts.session = session;
    return this.model.findByIdAndUpdate(id, update, opts).lean<T>().exec();
  }

  updateMany(
    filter: FilterQuery<T>,
    update: UpdateQuery<T>,
    session?: ClientSession,
  ): Promise<number> {
    const q = this.model.updateMany(filter, update);
    if (session) q.session(session);
    return q.then((r) => r.modifiedCount);
  }

  deleteById(id: string, session?: ClientSession): Promise<boolean> {
    const q = this.model.findByIdAndDelete(id);
    if (session) q.session(session);
    return q.then((doc) => !!doc);
  }

  upsert(
    filter: FilterQuery<T>,
    data: Partial<T>,
    session?: ClientSession,
  ): Promise<T> {
    const opts: any = { upsert: true, new: true, setDefaultsOnInsert: true };
    if (session) opts.session = session;
    return this.model
      .findOneAndUpdate(filter, data, opts)
      .lean<T>()
      .exec() as unknown as Promise<T>;
  }
}
